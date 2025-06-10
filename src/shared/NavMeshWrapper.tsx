import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { init } from 'recast-navigation';
import { threeToSoloNavMesh, DebugDrawer, NavMeshHelper } from '@recast-navigation/three';
import { GLTF } from 'three-stdlib';
import { SoloNavMeshGeneratorConfig } from 'recast-navigation/generators';

interface NavMeshWrapperProps {
    glbUrl: string;
    navMeshConfig?: Partial<SoloNavMeshGeneratorConfig>;
}

const NavMeshWrapper: React.FC<NavMeshWrapperProps> = ({ glbUrl, navMeshConfig = {} }) => {
    const { scene } = useThree();
    const { scene: gltfScene } = useGLTF(glbUrl) as GLTF;
    const [isInitialized, setIsInitialized] = useState(false);
    const debugDrawerRef = useRef<DebugDrawer | null>(null);
    const navMeshHelperRef = useRef<NavMeshHelper | null>(null);
    const modelRef = useRef<THREE.Group>(new THREE.Group());

    // Initialize recast-navigation
    useEffect(() => {
        const initialize = async () => {
            await init();
            setIsInitialized(true);
        };
        initialize();
    }, []);

    // Handle GLB and generate navmesh
    useEffect(() => {
        if (!isInitialized || !gltfScene) return;

        // Clear previous model
        while (modelRef.current.children.length) {
            modelRef.current.remove(modelRef.current.children[0]);
        }

        // Add new model
        modelRef.current.add(gltfScene);
        scene.add(modelRef.current);

        // Collect meshes for navmesh generation
        const meshes: THREE.Mesh[] = [];
        gltfScene.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) {
                meshes.push(child as THREE.Mesh);
            }
        });

        // Generate navmesh
        const { success, navMesh } = threeToSoloNavMesh(meshes, {
            cs: 0.05,
            ch: 0.2,
            ...navMeshConfig,
        });

        if (success && navMesh) {
            // Clean up previous debug drawer and helper
            if (debugDrawerRef.current) {
                debugDrawerRef.current.reset();
                debugDrawerRef.current.dispose();
            }
            if (navMeshHelperRef.current) {
                scene.remove(navMeshHelperRef.current);
                // NavMeshHelper does not have a dispose method
            }

            // Create new debug drawer
            debugDrawerRef.current = new DebugDrawer();
            debugDrawerRef.current.drawNavMesh(navMesh);

            // Create navmesh helper with custom material
            const navMeshMaterial = new THREE.MeshBasicMaterial({
                color: 'blue',
                wireframe: true,
                transparent: true,
                opacity: 0.5,
            });
            navMeshHelperRef.current = new NavMeshHelper(navMesh, { navMeshMaterial });
            scene.add(navMeshHelperRef.current);
        }

        // Cleanup on unmount
        return () => {
            if (debugDrawerRef.current) {
                debugDrawerRef.current.reset();
                debugDrawerRef.current.dispose();
            }
            if (navMeshHelperRef.current) {
                scene.remove(navMeshHelperRef.current);
                // NavMeshHelper does not have a dispose method
            }
            scene.remove(modelRef.current);
        };
    }, [glbUrl, isInitialized, gltfScene, scene, navMeshConfig]);

    return <primitive object={modelRef.current} />;
};

export default NavMeshWrapper;