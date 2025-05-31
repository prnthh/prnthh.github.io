"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { ShadowLight } from "./ShadowLight";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows>
                    <Physics>
                        <RigidBody>
                            <mesh castShadow receiveShadow>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial color="orange" />
                            </mesh>
                        </RigidBody>
                        <RigidBody type="fixed">
                            <mesh position={[0, -2, 0]} scale={[10, 0.1, 10]} receiveShadow>
                                <boxGeometry />
                                <meshStandardMaterial color="gray" />
                            </mesh>
                        </RigidBody>
                        <ambientLight intensity={0.5} />
                        <ShadowLight />
                        <OrbitControls />
                    </Physics>
                </Canvas>
            </div>
        </div>
    );
}
