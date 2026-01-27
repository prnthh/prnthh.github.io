"use client";

import { GameCanvas } from "react-three-game";
import RiggedModel from "./rigged";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { Object3D } from "three";
import Mouth from "./Mouth";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";

export default function CharacterPage() {
    const [focusedModelIndex, setFocusedModelIndex] = useState(0);
    const allModels = [
        "/models/human/onimilio/rigged.glb",
        "/models/human/oni2/character.glb",
        "/models/human/rigga/rigga.glb",
        "/models/human/rigga/rigga2.glb",
        "/models/human/rigga/rigga3.glb",
        "/models/human/rigga/rigga4.glb",
        "/models/human/rigga/rigga5.glb",
        "/models/human/rigga/rigga6.glb",
        "/models/human/milady.glb",
        // "/models/human/barney_hd.glb",
        "/models/human/Soldier.glb",
        "/models/human/xbot.glb",
        "/models/human/ybot.glb",
    ];
    return <div className="w-screen h-screen">
        <GameCanvas>
            {allModels.map((modelUrl, index) => (
                <group key={index} position={[index * 2 - focusedModelIndex * 2, 0, 0]} rotation={[0, 0, 0]} >
                    <AnimatedModel model={modelUrl}>
                        <Mouth />
                    </AnimatedModel>
                </group>
            ))}

            <ambientLight intensity={1.5} />
            <gridHelper args={[10, 10]} position={[0, 0, 0]} />
            <OrbitControls makeDefault enablePan={false} />
        </GameCanvas>
        <div className="absolute top-8 right-8 flex flex-col">
            <button>add instance</button>
            <button>play animation</button>
            <button onClick={() => setFocusedModelIndex((prev) => (prev - 1 + allModels.length) % allModels.length)}>previous</button>
            <button onClick={() => setFocusedModelIndex((prev) => (prev + 1) % allModels.length)}>next</button>

        </div>
    </div>
}
