"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import Ground from "./ground/flat";
import TerrainComponent from "./ground/terrain";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas>
                    <Physics>
                        <TerrainComponent />
                        <ambientLight intensity={0.5} />
                        <pointLight position={[0, 100, 0]} intensity={20000} />
                        <OrbitControls />
                    </Physics>
                </Canvas>
            </div>
        </div>
    );
}
