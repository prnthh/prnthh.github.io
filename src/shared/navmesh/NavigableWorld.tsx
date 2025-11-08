import { useThree } from "@react-three/fiber";
import { RefObject, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { init, NavMesh, TileCache } from 'recast-navigation';
import { NavMeshHelper, threeToSoloNavMesh, threeToTileCache, TileCacheHelper } from '@recast-navigation/three';
import NavigableCrowd from "@/shared/navmesh/NavigableCrowd";

const NavigableWorld = ({ debug, children }: { debug?: boolean; children: React.ReactNode }) => {
    const { scene } = useThree();
    const worldRef = useRef<THREE.Group>(null);
    const navMeshRef = useRef<NavMesh | null>(null);
    const [navMeshReady, setNavMeshReady] = useState(false);

    const setupNavMesh = async () => {
        await init();
        generateSmartMesh();
        setNavMeshReady(true);
    };

    const getSceneMeshes = (): THREE.Mesh[] => {
        if (!worldRef.current) return [];
        const meshes: THREE.Mesh[] = [];
        worldRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                meshes.push(child);
            }
        });
        return meshes;
    };

    const generateSoloMesh = () => {
        const { success, navMesh } = threeToSoloNavMesh(getSceneMeshes(), {});
        if (!success || !navMesh) {
            console.error("Failed to generate nav mesh");
            return;
        }
        navMeshRef.current = navMesh;
        debug && generateNavmeshHelper(navMesh);
    };

    const generateSmartMesh = () => {
        const { success, navMesh, tileCache } = threeToTileCache(getSceneMeshes(), {
            tileSize: 16,
        });

        if (!success || !navMesh) {
            console.error("Failed to generate nav mesh");
            return;
        }
        navMeshRef.current = navMesh;
        debug && generateTileCacheHelper(tileCache);
        debug && generateNavmeshHelper(navMesh);
    }
    // After adding or removing obstacles you can call tileCache.update(navMesh) to rebuild navmesh tiles.

    const generateNavmeshHelper = (navMesh: NavMesh) => {
        const navMeshHelper = new NavMeshHelper(navMesh);
        scene.add(navMeshHelper);
        navMeshHelper.update();
    }

    const generateTileCacheHelper = (tileCache: TileCache) => {
        const tileCacheHelper = new TileCacheHelper(tileCache);
        scene.add(tileCacheHelper);
        tileCacheHelper.update();
    }

    useEffect(() => {
        if (worldRef.current)
            setupNavMesh();
    }, [worldRef.current]);

    return (
        <group name='world' ref={worldRef}>
            {children}

            {navMeshReady && navMeshRef.current !== null && <NavigableCrowd
                navMeshRef={navMeshRef as RefObject<NavMesh>}
            />}


            <object3D position={[1.5, 0, -1.5]} />
        </group>
    );
}

export default NavigableWorld;
