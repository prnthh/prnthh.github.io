"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import Building from "./building/building";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas>
                    <Physics>
                        <Building />
                        <RigidBody type="fixed">
                            <mesh position={[0, -0.01, 0]} scale={[10, 0.01, 10]}>
                                <boxGeometry />
                                <meshStandardMaterial color="yellow" />
                            </mesh>
                        </RigidBody>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} />
                        <OrbitControls />
                    </Physics>
                </Canvas>
            </div>
        </div>
    );
}
