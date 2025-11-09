"use client";

import { Physics } from "@react-three/rapier";
import { CharacterController } from "./CharacterController";
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
                            <CharacterController />
                            <DemoWorld />
                        </Physics>
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}
