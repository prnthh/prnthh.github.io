"use client";

import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { RagdollR3F } from "./RagdollR3F";
import GameCanvas from "@/shared/GameCanvas";
import DemoWorld from "@/shared/debug/DemoWorld";

export default function Home() {

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>
                        <RagdollR3F />
                        <DemoWorld />
                        <OrbitControls target={[0, 0, 0]} />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}
