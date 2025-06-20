"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import Vehicle from "./car/base";
import Controls from "@/shared/ControlsProvider";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <Canvas>
                        <Physics>
                            <Vehicle debug />
                            <RigidBody type="fixed">
                                <mesh position={[0, -2, 0]} scale={[10, 0.5, 10]}>
                                    <boxGeometry />
                                    <meshStandardMaterial color="gray" />
                                </mesh>
                            </RigidBody>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                            <OrbitControls />
                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div>
    );
}
