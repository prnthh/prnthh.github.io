"use client";

import { Canvas } from "@react-three/fiber";
import { Merged, OrbitControls, useGLTF } from "@react-three/drei";
import { Perf } from "r3f-perf";
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
                    <Perf matrixUpdate />

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


type InstancesType = Record<string, ComponentType<any>>;

const context = createContext<InstancesType | undefined>(undefined)

function Instances({ children, ...props }: { children: ReactNode;[key: string]: any }) {
    const { nodes } = useGLTF('/models/environment/inst-transformed.glb')
    const instances = useMemo(
        () => ({
            Cube: nodes.Cube,
            Cube1: nodes.Cube002,
            Cube2: nodes.Cube003
        }),
        [nodes]
    )
    return (
        <Merged frames={1} meshes={instances} {...props}>
            {(instances) => <context.Provider value={instances}>{children}</context.Provider>}
        </Merged>
    )
}


function Model(props: any) {
    const instances = useContext(context)
    if (!instances) return null;
    return (
        <group {...props} dispose={null}>
            <instances.Cube />
            <instances.Cube position={[-0.8, 2.99, -1.88]} />
            <instances.Cube1 position={[1.11, 1.77, -4.7]} />
            <instances.Cube2 position={[2.37, -1.57, -3.43]} />
        </group>
    )
}

useGLTF.preload('/inst-transformed.glb')
