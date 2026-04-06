"use client";

import { GameCanvas } from "react-three-game";
import { Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useState } from "react";
import Mouth from "./Mouth";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import { Vector3 } from "three";
import { DebugGroundVisual } from "@/shared/ground/DebugGround";

const animationList = ["idle", "walk"] as const;

const animationOverrides = {
    idle: "/models/human/anim/idle.fbx",
    walk: "/models/human/anim/walk.fbx",
};

type AnimationRequest = {
    id: number;
    targetModelIndex: number;
};

function ControlledAnimatedModel({
    modelIndex,
    model,
    position,
    animationRequest,
}: {
    modelIndex: number;
    model: string;
    position: [number, number, number];
    animationRequest: AnimationRequest;
}) {
    const [animationIndex, setAnimationIndex] = useState(0);

    useEffect(() => {
        if (animationRequest.id === 0 || animationRequest.targetModelIndex !== modelIndex) return;

        setAnimationIndex((prev) => (prev + 1) % animationList.length);
    }, [animationRequest, modelIndex]);

    return (
        <group position={position} rotation={[0, 0, 0]}>
            <AnimatedModel
                model={model}
                animation={animationList[animationIndex]}
                animationOverrides={animationOverrides}
            >
                <Mouth />
            </AnimatedModel>
        </group>
    );
}

export default function CharacterPage() {
    const [focusedModelIndex, setFocusedModelIndex] = useState(0);
    const [animationRequest, setAnimationRequest] = useState<AnimationRequest>({ id: 0, targetModelIndex: 0 });
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
        <GameCanvas camera={{ position: [0, 1.5, 3], }}>
            {allModels.map((modelUrl, index) => (
                <ControlledAnimatedModel
                    key={modelUrl}
                    modelIndex={index}
                    model={modelUrl}
                    position={[index * 2 - focusedModelIndex * 2, 0, 0]}
                    animationRequest={animationRequest}
                />
            ))}

            <ambientLight intensity={2} />
            <DebugGroundVisual />
            <OrbitControls target={new Vector3(0, 0.5, 0)} makeDefault enablePan={false} />

            <Environment background frames={1}>
                <mesh>
                    <sphereGeometry args={[50, 64, 64]} />
                    <meshBasicMaterial
                        color="#87CEEB"
                        side={2}
                        depthWrite={false}
                        fog={false}
                    />
                </mesh>
            </Environment>
        </GameCanvas>
        <div className="absolute top-8 right-8 flex flex-col">
            <button>add instance</button>
            <button onClick={() => setAnimationRequest((prev) => ({
                id: prev.id + 1,
                targetModelIndex: focusedModelIndex,
            }))}>
                next animation
            </button>
            <button onClick={() => setFocusedModelIndex((prev) => (prev - 1 + allModels.length) % allModels.length)}>previous</button>
            <button onClick={() => setFocusedModelIndex((prev) => (prev + 1) % allModels.length)}>next</button>

        </div>
    </div>
}
