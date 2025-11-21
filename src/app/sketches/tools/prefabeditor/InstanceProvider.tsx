import React, { createContext, useContext, useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Merged } from '@react-three/drei';
import * as THREE from 'three';
import { InstancedRigidBodies } from "@react-three/rapier";

// --- Types ---
export type InstanceData = {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    meshPath: string;
    physics?: { type: 'dynamic' | 'fixed' };
};

function arrayEquals(a: number[], b: number[]) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function instanceEquals(a: InstanceData, b: InstanceData) {
    return a.id === b.id &&
        a.meshPath === b.meshPath &&
        arrayEquals(a.position, b.position) &&
        arrayEquals(a.rotation, b.rotation) &&
        arrayEquals(a.scale, b.scale) &&
        a.physics?.type === b.physics?.type;
}

// --- Context ---
type GameInstanceContextType = {
    addInstance: (instance: InstanceData) => void;
    removeInstance: (id: string) => void;
    instances: InstanceData[];
    meshes: Record<string, THREE.Mesh>;
    instancesMap?: Record<string, React.ComponentType<any>>;
    modelParts?: Record<string, number>;
};
const GameInstanceContext = createContext<GameInstanceContextType | null>(null);

// --- Provider ---
export function GameInstanceProvider({
    children,
    models
}: {
    children: React.ReactNode,
    models: { [filename: string]: THREE.Object3D }
}) {
    const [instances, setInstances] = useState<InstanceData[]>([]);

    // Add or update an instance by id
    const addInstance = useCallback((instance: InstanceData) => {
        setInstances(prev => {
            const idx = prev.findIndex(i => i.id === instance.id);
            if (idx !== -1) {
                if (instanceEquals(prev[idx], instance)) {
                    return prev;
                }
                const copy = [...prev];
                copy[idx] = instance;
                return copy;
            }
            return [...prev, instance];
        });
    }, []);

    // Remove an instance by id
    const removeInstance = useCallback((id: string) => {
        setInstances(prev => {
            if (!prev.find(i => i.id === id)) return prev;
            return prev.filter(i => i.id !== id);
        });
    }, []);

    // Memoize mesh extraction (without merging)
    const { flatMeshes, modelParts } = useMemo(() => {
        const flatMeshes: Record<string, THREE.Mesh> = {};
        const modelParts: Record<string, number> = {}; // Stores count of parts for each model

        Object.entries(models).forEach(([modelKey, model]) => {
            const root = model;
            root.updateWorldMatrix(false, true);
            const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();

            let partIndex = 0;

            root.traverse((obj: any) => {
                if (obj.isMesh) {
                    const geom = obj.geometry.clone();

                    // Bake local transform into geometry
                    const relativeTransform = obj.matrixWorld.clone().premultiply(rootInverse);
                    geom.applyMatrix4(relativeTransform);

                    // Create a mesh for this part
                    const partKey = `${modelKey}__${partIndex}`;
                    flatMeshes[partKey] = new THREE.Mesh(geom, obj.material);
                    partIndex++;
                }
            });
            modelParts[modelKey] = partIndex;
        });

        return { flatMeshes, modelParts };
    }, [models]);

    // Group instances by meshPath and physics type
    const grouped = useMemo(() => {
        const groups: Record<string, { physicsType: string, instances: InstanceData[] }> = {};
        for (const inst of instances) {
            const type = inst.physics?.type || 'none';
            const key = `${inst.meshPath}__${type}`;
            if (!groups[key]) groups[key] = { physicsType: type, instances: [] };
            groups[key].instances.push(inst);
        }
        return groups;
    }, [instances]);

    return (
        <Merged meshes={flatMeshes} castShadow receiveShadow>
            {(instancesMap: any) => (
                <GameInstanceContext.Provider value={{
                    addInstance,
                    removeInstance,
                    instances,
                    meshes: flatMeshes,
                    instancesMap,
                    modelParts // Expose part counts
                }}>
                    {/* Render instanced rigid bodies for groups with physics */}
                    {Object.entries(grouped).map(([key, group]) => {
                        if (group.physicsType === 'none') return null;
                        const modelKey = group.instances[0].meshPath;
                        const partCount = modelParts[modelKey] || 0;
                        if (partCount === 0) return null;

                        return <InstancedRigidGroup
                            key={key}
                            group={group}
                            modelKey={modelKey}
                            partCount={partCount}
                            flatMeshes={flatMeshes}
                        />;
                    })}
                    {/* Render children (non-physics instances handled by GameInstance) */}
                    {children}
                </GameInstanceContext.Provider>
            )}
        </Merged>
    );
}

// --- InstancedRigidGroup: Handles instanced rigidbodies for a group ---
function InstancedRigidGroup({
    group,
    modelKey,
    partCount,
    flatMeshes
}: {
    group: { physicsType: string, instances: InstanceData[] },
    modelKey: string,
    partCount: number,
    flatMeshes: Record<string, THREE.Mesh>
}) {
    const instances = useMemo(() => group.instances.map(inst => ({
        key: inst.id,
        position: inst.position,
        rotation: inst.rotation,
        scale: inst.scale,
    })), [group.instances]);

    return (
        <InstancedRigidBodies
            instances={instances}
            colliders={group.physicsType === 'fixed' ? 'trimesh' : 'hull'}
            type={group.physicsType as 'dynamic' | 'fixed'}
        >
            {Array.from({ length: partCount }).map((_, i) => {
                const mesh = flatMeshes[`${modelKey}__${i}`];
                return (
                    <instancedMesh
                        key={i}
                        args={[mesh.geometry, mesh.material, group.instances.length]}
                        castShadow
                        receiveShadow
                        frustumCulled={false}
                    />
                );
            })}
        </InstancedRigidBodies>
    );
}

// --- GameInstance: Registers an instance and renders it if non-physics ---
export const GameInstance = React.forwardRef<THREE.Group, {
    id: string;
    modelUrl: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    physics?: { type: 'dynamic' | 'fixed' };
    children?: React.ReactNode;
}>(({
    id,
    modelUrl,
    position,
    rotation,
    scale,
    physics = undefined,
    children
}, ref) => {
    const ctx = useContext(GameInstanceContext);
    const addInstance = ctx?.addInstance;
    const removeInstance = ctx?.removeInstance;

    useEffect(() => {
        if (!addInstance || !removeInstance) return;
        const instance: InstanceData = {
            id,
            meshPath: modelUrl,
            position,
            rotation,
            scale,
            physics,
        };
        addInstance(instance);
        return () => {
            removeInstance(instance.id);
        };
    }, [addInstance, removeInstance, id, modelUrl, position, rotation, scale, physics]);

    if (!ctx || !ctx.instancesMap) return null;

    // If physics is enabled, it's handled by InstancedRigidGroup in the provider
    if (physics) return null;

    // Otherwise, render using Merged instances
    // We need to render all parts of the model
    const partCount = ctx.modelParts?.[modelUrl] || 0;
    if (partCount === 0) return null;

    return (
        <group
            ref={ref}
            position={position}
            rotation={rotation}
            scale={scale}
        >
            {Array.from({ length: partCount }).map((_, i) => {
                const Instance = ctx.instancesMap![`${modelUrl}__${i}`];
                if (!Instance) return null;
                return <Instance key={i} />;
            })}
            {children}
        </group>
    );
});
