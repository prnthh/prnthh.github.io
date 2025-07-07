"use client";

import { Canvas } from "@react-three/fiber";
import { Merged, OrbitControls, useGLTF } from "@react-three/drei";
import { createContext, useContext, useMemo } from "react";
import { MathUtils } from "three";
import * as THREE from "three";
import type { ComponentType, ReactNode } from "react";

const positions = Array.from({ length: 1000 }, () => ({
    position: [MathUtils.randFloatSpread(10), MathUtils.randFloatSpread(10), MathUtils.randFloatSpread(10)],
    rotation: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2]
}))

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
                    <ambientLight />
                    <directionalLight position={[10, 10, 10]} />
                    <Instances>
                        {positions.map((props, index) => (
                            <Model
                                key={index}
                                scale={0.1}
                                {...props}
                                matrixAutoUpdate={false}
                                onUpdate={(self: THREE.Object3D) => self.updateMatrix()}
                            />
                        ))}
                    </Instances>
                    <OrbitControls enableDamping={false} />
                </Canvas>
            </div>
        </div>
    );
}


type MeshInfo = {
    component: ComponentType<any>;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
};

type InstancesMap = Record<string, MeshInfo>;

type MergedInstancesMap = Record<string, ComponentType<any>>;

type InstancesContextType = {
    mergedInstances: MergedInstancesMap;
    instances: InstancesMap;
};

const context = createContext<InstancesContextType | undefined>(undefined);

function Instances({ children, ...props }: { children: ReactNode;[key: string]: any }) {
    const { nodes } = useGLTF('/models/environment/cubeart.glb');
    const instances = useMemo<InstancesMap>(() => {
        // Recursively find all meshes in nodes and store their original transforms
        const meshes: InstancesMap = {};
        function findMeshes(obj: any, prefix = "") {
            for (const key in obj) {
                const value = obj[key];
                if (value && value.isMesh) {
                    meshes[prefix + key] = {
                        component: value.type, // store the type (component) for Merged
                        position: value.position ? value.position.toArray() as [number, number, number] : [0, 0, 0],
                        rotation: value.rotation ? [value.rotation.x, value.rotation.y, value.rotation.z] as [number, number, number] : [0, 0, 0],
                        scale: value.scale ? value.scale.toArray() as [number, number, number] : [1, 1, 1]
                    };
                } else if (value && typeof value === "object" && !Array.isArray(value)) {
                    findMeshes(value, prefix + key + ".");
                }
            }
        }
        findMeshes(nodes);
        return meshes;
    }, [nodes]);

    // Prepare meshes for <Merged>: only actual mesh objects, not components
    const mergedMeshes = useMemo(() => {
        const result: Record<string, THREE.Mesh> = {};
        function findMeshes(obj: any, prefix = "") {
            for (const key in obj) {
                const value = obj[key];
                if (value && value.isMesh) {
                    result[prefix + key] = value;
                } else if (value && typeof value === "object" && !Array.isArray(value)) {
                    findMeshes(value, prefix + key + ".");
                }
            }
        }
        findMeshes(nodes);
        return result;
    }, [nodes]);

    return (
        <Merged frames={1} meshes={mergedMeshes} {...props}>
            {(mergedInstances: MergedInstancesMap) => (
                <context.Provider value={{ mergedInstances, instances }}>{children}</context.Provider>
            )}
        </Merged>
    );
}

function Model(props: any) {
    const ctx = useContext(context);
    if (!ctx) return null;
    const { mergedInstances, instances } = ctx;
    return (
        <group {...props} dispose={null}>
            {Object.entries(instances).map(([key, { position, rotation, scale }]) => {
                const MeshComponent = mergedInstances[key];
                return (
                    <MeshComponent
                        key={key}
                        position={position}
                        rotation={rotation}
                        scale={scale}
                    />
                );
            })}
        </group>
    );
}

useGLTF.preload('/inst-transformed.glb')
