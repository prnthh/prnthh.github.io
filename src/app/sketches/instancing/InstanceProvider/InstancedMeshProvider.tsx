import React, { createContext, useContext, useMemo } from 'react';
import { Merged, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Context for merged mesh instances
const InstanceMeshesContext = createContext<any>(undefined);

// Accept mesh options as a prop instead of hardcoding
export type MeshOption = { name: string; path: string };

export function InstancedMeshProvider({ meshOptions, children }: { meshOptions: MeshOption[]; children: React.ReactNode }) {
    // Use useGLTF with an array of paths
    const gltfs = useGLTF(meshOptions.map(opt => opt.path));

    function getMeshesFromScene(root: THREE.Object3D, modelKey: string) {
        const meshes: Record<string, THREE.Mesh> = {};
        let meshIndex = 0;
        function collectMeshes(obj: THREE.Object3D) {
            if ((obj as THREE.Mesh).isMesh) {
                // Use a unique key based on modelKey and meshIndex
                const key = `${modelKey}_${meshIndex}`;
                meshes[key] = obj as THREE.Mesh;
                meshIndex++;
            }
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(child => collectMeshes(child));
            }
        }
        collectMeshes(root);
        // Debug: log mesh keys
        if (Object.keys(meshes).length === 0) {
            console.warn(`No meshes found in model: ${modelKey}`);
        } else {
            console.log(`Meshes for ${modelKey}:`, Object.keys(meshes));
        }
        return meshes;
    }

    // Merge meshes from all loaded models
    const meshes = useMemo(() => (
        Object.assign({}, ...gltfs.map((gltf, i) => getMeshesFromScene(gltf.scene, meshOptions[i].name)))
    ), [gltfs, meshOptions]);

    return (
        <Merged meshes={meshes} castShadow receiveShadow>
            {(instances) => (
                <InstanceMeshesContext.Provider value={instances}>
                    {children}
                </InstanceMeshesContext.Provider>
            )}
        </Merged>
    );
}

export function useInstanceMeshes() {
    const ctx = useContext(InstanceMeshesContext);
    if (!ctx) throw new Error('useInstanceMeshes must be used within an InstancedMeshProvider');
    return ctx;
}
