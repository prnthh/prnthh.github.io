"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import Controls from "@/shared/ControlsProvider";
import { CharacterController } from "./CharacterController";
import MapModel from "../../floor/ground/ground/model";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <Canvas shadows>
                        <ShadowLight />

                        <Physics>
                            <CharacterController />
                            <RigidBody position={[0, 5, 2]}>
                                <mesh castShadow receiveShadow>
                                    <boxGeometry args={[1, 1, 1]} />
                                    <meshStandardMaterial color="orange" />
                                </mesh>
                            </RigidBody>
                            <MapModel />
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div>
    );
}
