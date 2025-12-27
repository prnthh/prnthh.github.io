import { createContext, useContext, useRef, useState, useEffect, useCallback, ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { init, NavMesh, Crowd, CrowdAgent, NavMeshQuery } from 'recast-navigation';
import { NavMeshHelper, threeToTileCache, TileCacheHelper, CrowdHelper } from '@recast-navigation/three';

// ============================================================================
// Types
// ============================================================================

export type Vector3Tuple = [number, number, number];

export type AgentConfig = {
    radius?: number;
    height?: number;
    maxAcceleration?: number;
    maxSpeed?: number;
};

export type AgentHandle = {
    id: string;
    getPosition: () => Vector3Tuple;
    getVelocity: () => Vector3Tuple;
    setTarget: (position: Vector3Tuple) => void;
};

type NavigableContextValue = {
    isReady: boolean;
    registerAgent: (position: Vector3Tuple, config?: AgentConfig) => AgentHandle | null;
    unregisterAgent: (id: string) => void;
};

// ============================================================================
// Context
// ============================================================================

const NavigableContext = createContext<NavigableContextValue | null>(null);

export const useNavigable = () => {
    const context = useContext(NavigableContext);
    if (!context) {
        throw new Error("useNavigable must be used within a NavigableWorld");
    }
    return context;
};

// ============================================================================
// NavigableWorld Component
// ============================================================================

export type NavigableWorldProps = {
    children: ReactNode;
    debug?: boolean;
    maxAgents?: number;
};

export const NavigableWorld = ({
    children,
    debug = false,
    maxAgents = 50,
}: NavigableWorldProps) => {
    const { scene } = useThree();
    const worldRef = useRef<THREE.Group>(null);
    const navMeshRef = useRef<NavMesh | null>(null);
    const crowdRef = useRef<Crowd | null>(null);
    const navMeshQueryRef = useRef<NavMeshQuery | null>(null);
    const crowdHelperRef = useRef<CrowdHelper | null>(null);
    const agentsMapRef = useRef<Map<string, CrowdAgent>>(new Map());
    const agentIdCounter = useRef(0);

    const [isReady, setIsReady] = useState(false);

    // Collect meshes for navmesh generation
    const getSceneMeshes = useCallback((): THREE.Mesh[] => {
        if (!worldRef.current) return [];
        const meshes: THREE.Mesh[] = [];
        worldRef.current.traverse((child) => {
            if (child.userData.excludeFromNavMesh) return;
            if (child instanceof THREE.Mesh) {
                meshes.push(child);
            }
        });
        return meshes;
    }, []);

    // Initialize navmesh and crowd
    useEffect(() => {
        if (!worldRef.current) return;

        let mounted = true;

        const setup = async () => {
            await init();

            const meshes = getSceneMeshes();
            if (meshes.length === 0) {
                console.warn("NavigableWorld: No meshes found for navmesh generation");
                return;
            }

            const { success, navMesh, tileCache } = threeToTileCache(meshes, { tileSize: 16 });

            if (!success || !navMesh || !mounted) {
                if (mounted) console.error("NavigableWorld: Failed to generate navmesh");
                return;
            }

            navMeshRef.current = navMesh;
            crowdRef.current = new Crowd(navMesh, { maxAgents, maxAgentRadius: 0.6 });
            navMeshQueryRef.current = new NavMeshQuery(navMesh);

            // Debug visualization
            if (debug) {
                const navMeshHelper = new NavMeshHelper(navMesh);
                const tileCacheHelper = new TileCacheHelper(tileCache);
                const crowdHelper = new CrowdHelper(crowdRef.current, {
                    agentMaterial: new THREE.MeshBasicMaterial({ color: 'red' }),
                });

                [navMeshHelper, tileCacheHelper, crowdHelper].forEach(helper => {
                    helper.traverse(child => { child.userData.excludeFromNavMesh = true; });
                    scene.add(helper);
                });

                crowdHelperRef.current = crowdHelper;
                navMeshHelper.update();
                tileCacheHelper.update();
            }

            if (mounted) setIsReady(true);
        };

        setup();

        return () => {
            mounted = false;
            navMeshQueryRef.current?.destroy();
            if (crowdHelperRef.current) scene.remove(crowdHelperRef.current);
            crowdRef.current = null;
            navMeshRef.current = null;
            navMeshQueryRef.current = null;
            agentsMapRef.current.clear();
            setIsReady(false);
        };
    }, [debug, getSceneMeshes, maxAgents, scene]);

    // Register a new agent
    const registerAgent = useCallback((position: Vector3Tuple, config?: AgentConfig): AgentHandle | null => {
        const crowd = crowdRef.current;
        const query = navMeshQueryRef.current;
        if (!crowd || !query) return null;

        const { point } = query.findClosestPoint({ x: position[0], y: position[1], z: position[2] });

        const agent = crowd.addAgent(point, {
            radius: config?.radius ?? 0.5,
            height: config?.height ?? 2.0,
            maxAcceleration: config?.maxAcceleration ?? 4.0,
            maxSpeed: config?.maxSpeed ?? 4.0,
            collisionQueryRange: 1.2,
            pathOptimizationRange: 0.0,
        });

        const id = `nav-agent-${agentIdCounter.current++}`;
        agentsMapRef.current.set(id, agent);
        crowdHelperRef.current?.update();

        return {
            id,
            getPosition: () => {
                const p = agent.position();
                return [p.x, p.y, p.z];
            },
            getVelocity: () => {
                const v = agent.velocity();
                return [v.x, v.y, v.z];
            },
            setTarget: (target: Vector3Tuple) => {
                if (!navMeshQueryRef.current) return;
                const { nearestPoint } = navMeshQueryRef.current.findNearestPoly({
                    x: target[0], y: target[1], z: target[2]
                });
                agent.requestMoveTarget(nearestPoint);
            },
        };
    }, []);

    // Unregister an agent
    const unregisterAgent = useCallback((id: string) => {
        const agent = agentsMapRef.current.get(id);
        if (agent && crowdRef.current) {
            crowdRef.current.removeAgent(agent);
            agentsMapRef.current.delete(id);
            crowdHelperRef.current?.update();
        }
    }, []);

    // Throttle debug helper updates
    const lastHelperUpdate = useRef(0);

    // Update crowd simulation each frame
    useFrame((state, delta) => {
        crowdRef.current?.update(Math.min(delta, 0.1));

        // Only update debug helper every 100ms instead of every frame
        if (debug && crowdHelperRef.current) {
            const now = state.clock.elapsedTime;
            if (now - lastHelperUpdate.current > 0.1) {
                crowdHelperRef.current.update();
                lastHelperUpdate.current = now;
            }
        }
    });

    return (
        <NavigableContext.Provider value={{ isReady, registerAgent, unregisterAgent }}>
            <group name="navigable-world" ref={worldRef}>
                {children}
            </group>
        </NavigableContext.Provider>
    );
};

export default NavigableWorld;
