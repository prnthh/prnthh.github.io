"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { CharacterController } from "./CharacterController";
import Controls from "@/shared/controls/ControlsProvider";
import DemoWorld from "@/shared/DemoWorld";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <Canvas>
                        <Physics>
                            <CharacterController />
                            <DemoWorld />
                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div>
    );
}
