import React, { createContext, useContext, useMemo } from 'react';
import { Bvh, Merged, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Context for merged mesh instances
const InstanceMeshesContext = createContext<any>(undefined);
export type InstanceData = {
    position: [number, number, number];
    rotation: [number, number, number];
    meshPath: string;
};


// Accept mesh options as a prop instead of hardcoding
export type MeshOption = { name: string; path: string };

interface InstanceProps {
    data: InstanceData[];
}

export function InstancedMeshProvider({ meshOptions, children }: { meshOptions: MeshOption[]; children: React.ReactNode }) {
    // Use useGLTF with an array of paths
    const gltfs = useGLTF(meshOptions.map(opt => opt.path));

    function getMeshesFromScene(root: THREE.Object3D, modelKey: string) {
        const meshes: Record<string, THREE.Mesh> = {};
        let meshIndex = 0;
        function collectMeshes(obj: THREE.Object3D) {
            if ((obj as unknown as THREE.Mesh).isMesh) {
                // Use a unique key based on modelKey and meshIndex
                const key = `${modelKey}_${meshIndex}`;
                meshes[key] = obj as unknown as THREE.Mesh;
                meshIndex++;
            }
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(child => collectMeshes(child as unknown as THREE.Object3D));
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
        Object.assign({}, ...gltfs.map((gltf, i) => getMeshesFromScene(gltf.scene as unknown as THREE.Object3D, meshOptions[i].name)))
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


export function InstanceView({ data }: InstanceProps) {
    const instances = useInstanceMeshes();
    const meshNames = Object.keys(instances);

    return (
        <>
            {data.map((props, i) => {
                // Use meshPath as the key and identifier
                const meshPath = props.meshPath;
                // Find mesh instance(s) whose name includes the meshPath (or is equal)
                const meshNamesToUse = meshNames.filter((n) =>
                    typeof n === 'string' && meshPath && n.includes(meshPath)
                );
                return (
                    <group key={meshPath + '-' + i} position={props.position} rotation={props.rotation}>
                        {meshNamesToUse.map((name) => {
                            const Instance = instances[name];
                            return (
                                <Instance
                                    key={name}
                                    scale={[1, 1, 1]}
                                />
                            );
                        })}
                    </group>
                );
            })}
        </>
    );
}
