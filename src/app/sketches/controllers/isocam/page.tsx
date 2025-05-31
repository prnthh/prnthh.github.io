"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import Controls from "@/shared/ControlsProvider";
import { CharacterController } from "./CharacterController";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <Canvas>
                        <Physics debug>
                            <CharacterController />
                            <RigidBody>
                                <mesh>
                                    <boxGeometry args={[1, 1, 1]} />
                                    <meshStandardMaterial color="orange" />
                                </mesh>
                            </RigidBody>
                            <RigidBody type="fixed">
                                <mesh position={[0, -2, 0]} scale={[10, 0.5, 10]}>
                                    <boxGeometry />
                                    <meshStandardMaterial color="gray" />
                                </mesh>
                            </RigidBody>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div>
    );
}
