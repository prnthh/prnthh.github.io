"use client";

import { GameCanvas } from "react-three-game";
import { Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useState } from "react";
import { Physics } from "@react-three/rapier";
import Mouth from "./Mouth";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import RigidHumanoidModel from "@/app/react-three-controller/ped/physics/RigidHumanoidModel";
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
    modelOffset,
    animationRequest,
    height,
    scale,
    showCollider,
}: {
    modelIndex: number;
    model: string;
    position: [number, number, number];
    modelOffset: [number, number, number];
    animationRequest: AnimationRequest;
    height: number;
    scale: number;
    showCollider: boolean;
}) {
    const [animationIndex, setAnimationIndex] = useState(0);

    useEffect(() => {
        if (animationRequest.id === 0 || animationRequest.targetModelIndex !== modelIndex) return;

        setAnimationIndex((prev) => (prev + 1) % animationList.length);
    }, [animationRequest, modelIndex]);

    const animation = animationList[animationIndex];

    if (showCollider) {
        return (
            <RigidHumanoidModel
                position={position}
                modelOffset={modelOffset}
                model={model}
                animation={animation}
                animationOverrides={animationOverrides}
                height={height}
                scale={scale}
            >
                <Mouth />
            </RigidHumanoidModel>
        );
    }

    return (
        <group position={position} rotation={[0, 0, 0]}>
            <AnimatedModel
                model={model}
                modelOffset={modelOffset}
                animation={animation}
                animationOverrides={animationOverrides}
                height={height}
                scale={scale}
            >
                <Mouth />
            </AnimatedModel>
        </group>
    );
}

export default function CharacterPage() {
    const [focusedModelIndex, setFocusedModelIndex] = useState(0);
    const [animationRequest, setAnimationRequest] = useState<AnimationRequest>({ id: 0, targetModelIndex: 0 });
    const [focusedHeight, setFocusedHeight] = useState(1);
    const [focusedScale, setFocusedScale] = useState(1);
    const [focusedYOffset, setFocusedYOffset] = useState(0);
    const [showCollider, setShowCollider] = useState(true);
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
            <Physics debug={showCollider} gravity={[0, 0, 0]}>
                {allModels.map((modelUrl, index) => {
                    const isFocused = index === focusedModelIndex;

                    return (
                        <ControlledAnimatedModel
                            key={modelUrl}
                            modelIndex={index}
                            model={modelUrl}
                            position={[index * 2 - focusedModelIndex * 2, 0, 0]}
                            modelOffset={[0, isFocused ? focusedYOffset : 0, 0]}
                            animationRequest={animationRequest}
                            height={isFocused ? focusedHeight : 1}
                            scale={isFocused ? focusedScale : 1}
                            showCollider={isFocused && showCollider}
                        />
                    );
                })}
            </Physics>

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
        <div className="absolute top-8 right-8 flex w-64 flex-col gap-3 rounded bg-black/50 p-4 text-white">

            <div className="flex justify-between">
                <button onClick={() => setFocusedModelIndex((prev) => (prev - 1 + allModels.length) % allModels.length)}>&lt;--</button>
                <button onClick={() => setFocusedModelIndex((prev) => (prev + 1) % allModels.length)}>--&gt;</button>
            </div>
            {allModels[focusedModelIndex]}

            <label className="flex flex-col gap-1 text-sm">
                <span>Focused Height: {focusedHeight.toFixed(2)}</span>
                <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.01"
                    value={focusedHeight}
                    onChange={(event) => setFocusedHeight(Number(event.target.value))}
                />
            </label>
            <label className="flex flex-col gap-1 text-sm">
                <span>Focused Scale: {focusedScale.toFixed(2)}</span>
                <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.01"
                    value={focusedScale}
                    onChange={(event) => setFocusedScale(Number(event.target.value))}
                />
            </label>
            <label className="flex flex-col gap-1 text-sm">
                <span>Focused Y Offset: {focusedYOffset.toFixed(2)}</span>
                <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.01"
                    value={focusedYOffset}
                    onChange={(event) => setFocusedYOffset(Number(event.target.value))}
                />
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={showCollider}
                    onChange={(event) => setShowCollider(event.target.checked)}
                />
                <span>Show Focused Collider</span>
            </label>
            <button>add instance</button>
            <button onClick={() => setAnimationRequest((prev) => ({
                id: prev.id + 1,
                targetModelIndex: focusedModelIndex,
            }))}>
                next animation
            </button>

        </div>
    </div>
}
