"use client";

import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { Road as TexturedRoad } from "./TexturedRoad";
import Controls from "@/shared/controls/ControlsProvider";
import DemoWorld from "@/shared/DemoWorld";
import GameCanvas from "@/shared/GameCanvas";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics>
                            <TexturedRoad />
                            <DemoWorld />
                        </Physics>
                        <OrbitControls />
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}
