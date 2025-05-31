"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import Vehicle from "./car/base";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "@/app/sketches/lighting/shadowmap/ShadowLight";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <Canvas shadows>
                        <Physics>
                            <Vehicle debug />
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
                </Controls>
            </div>
        </div >
    );
}
