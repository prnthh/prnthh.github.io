"use client";

import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import GameCanvas from "@/shared/GameCanvas";
import DemoWorld from "@/shared/DemoWorld";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics>
                        <DemoWorld />
                        <OrbitControls />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}
