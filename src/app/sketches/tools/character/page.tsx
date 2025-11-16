"use client";

import GameCanvas from "@/shared/GameCanvas";
import SimpleModel from "./rigged";
import { OrbitControls } from "@react-three/drei";

export default function CharacterPage() {
    const allModels = [
        "/models/human/onimilio/rigged.glb",
        "/models/human/oni2/character.glb",
        "/models/human/rigga/rigga.glb",
        "/models/human/rigga/rigga2.glb",
        "/models/human/rigga/rigga3.glb",
        "/models/human/rigga/rigga4.glb",
        "/models/human/rigga/rigga5.glb",
        "/models/human/rigga/rigga6.glb",
    ];
    return <div className="w-screen h-screen">
        <GameCanvas>
            {allModels.map((modelUrl, index) => (
                <group key={index}  >
                    <SimpleModel position={[index * 2 - (allModels.length - 1), 0, 2]} modelUrl={modelUrl} />
                </group>
            ))}

            <ambientLight intensity={1.5} />
            <gridHelper args={[10, 10]} position={[0, -1, 0]} />
            <OrbitControls makeDefault />
        </GameCanvas>
        <div className="absolute top-8 right-8 bg-white flex flex-col">
            <button>add instance</button>
            <button>next</button>
            <button>play animation</button>
        </div>
    </div>
}