"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { useState } from "react";
import { DragDropLoader } from "react-three-game";
import GameCanvas from "@/shared/GameCanvas";

export default function Home() {
    const [models, setModels] = useState<any[]>([]);

    return (
        <>
            <DragDropLoader onModelLoaded={model => setModels(prev => [...prev, model])} />
            <div className="w-full items-center justify-items-center min-h-screen" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics>
                        <RigidBody type="fixed">
                            <mesh position={[0, -2, 0]} scale={[10, 0.1, 10]} receiveShadow>
                                <boxGeometry />
                            </mesh>
                        </RigidBody>
                        {/* Render loaded models */}
                        {models.map((model, idx) => (
                            <RigidBody type="dynamic" key={idx}>
                                <primitive object={model} position={[0, 0, 0]} />
                            </RigidBody>
                        ))}
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
                        <OrbitControls />
                    </Physics>
                </GameCanvas>
            </div>
        </>
    );
}
