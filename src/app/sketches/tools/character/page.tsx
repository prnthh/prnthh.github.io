"use client";

import GameCanvas from "@/shared/GameCanvas";
import SimpleModel from "./rigged";
import DebugCamera from "@/shared/cameras/DebugCamera";

export default function CharacterPage() {
    return <div className="w-screen h-screen">
        <GameCanvas>
            <SimpleModel modelUrl="/models/human/onimilio/rigged.glb" />
            <ambientLight intensity={1.5} />
            <DebugCamera />
        </GameCanvas>
    </div>
}