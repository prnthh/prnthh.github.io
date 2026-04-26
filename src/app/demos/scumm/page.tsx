"use client";

import type { RefObject } from "react";
import { useState, useRef, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Box, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { GameCanvas } from "react-three-game";
import { PrefabRoot } from "react-three-game";
import CutsceneCamera from "@/shared/cameras/CutsceneCamera";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import type { AnimatedModelRef } from "@/app/react-three-character/types";

import room from "@public/samples/room.json";

const SCUMM_CAMERA_POSITION: [number, number, number] = [0, 0.6, 6];
const SCUMM_CAMERA_TARGET: [number, number, number] = [0, 0, 0];


export default function Home() {
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);
    const characterRef = useRef<AnimatedModelRef | null>(null);
    const [activeEntity, setActiveEntity] = useState<string | null>(null);

    const handleSurfaceClick = (e: ThreeEvent<PointerEvent>) => {
        const { x, y, z } = e.point;
        setTarget([x, y, z]);
        setActiveEntity(null);
    };

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <PrefabRoot
                        onClick={handleSurfaceClick}
                        onSelect={(id) => {
                            console.log("selected prefab root", id);
                        }}
                        data={room} />
                    <ambientLight intensity={1.5} />

                    {target && (
                        <Box receiveShadow position={target} args={[0.1, 0.1, 0.1]} castShadow />
                    )}

                    <ClickToWalkCharacter characterRef={characterRef} target={target} />
                    {activeEntity === null && <SidewaysFollowCamera characterRef={characterRef} />}

                    <AnimatedModel
                        modelOffset={[0, -0.8, 0]} scale={2.4} height={1.5} position={[2, 0, 2]}
                        model="/models/human/rigga/rigga.glb"
                        onClick={(e) => {
                            setActiveEntity("ped");
                            e?.stopPropagation();
                        }}
                    >
                        {activeEntity === "ped" && <CutsceneCamera position={[0, 1, 2]} />}
                    </AnimatedModel>
                </GameCanvas>
            </div>
        </div>
    );
}

const SidewaysFollowCamera = ({ characterRef }: { characterRef: RefObject<AnimatedModelRef | null> }) => {
    const orbitRef = useRef<OrbitControlsImpl | null>(null);
    const targetCameraX = useRef(0);
    const tolerance = 1;
    const camera = useThree((state) => state.camera);

    useLayoutEffect(() => {
        targetCameraX.current = SCUMM_CAMERA_TARGET[0];
        camera.position.set(...SCUMM_CAMERA_POSITION);

        if (orbitRef.current) {
            orbitRef.current.target.set(...SCUMM_CAMERA_TARGET);
            orbitRef.current.update();
        }
    }, [camera]);

    useFrame(({ camera }) => {
        const controls = orbitRef.current;
        const characterPos = characterRef.current?.groupRef.current?.position;
        if (controls && characterPos) {

            const offset = characterPos.x - targetCameraX.current;

            if (Math.abs(offset) > tolerance) {
                if (offset > 0) {
                    targetCameraX.current = characterPos.x - tolerance;
                } else {
                    targetCameraX.current = characterPos.x + tolerance;
                }
            }

            camera.position.x += (targetCameraX.current - camera.position.x) * 0.1;

            controls.target.x = camera.position.x;
            controls.target.y = 0;
            controls.target.z = 0;
            controls.update();
        }
    });

    return (
        <OrbitControls
            ref={orbitRef}
            target={[0, 0, 0]}
            enableRotate={false}
            enablePan={false}
            minDistance={3}
            maxDistance={15}
        />
    );
}

function ClickToWalkCharacter({
    characterRef,
    target,
}: {
    characterRef: RefObject<AnimatedModelRef | null>;
    target: [number, number, number];
}) {
    const animationRef = useRef("idle");

    useFrame((_, delta) => {
        const group = characterRef.current?.groupRef.current;
        if (!group) return;

        const [targetX, targetY, targetZ] = target;
        const dx = targetX - group.position.x;
        const dz = targetZ - group.position.z;
        const distance = Math.hypot(dx, dz);
        const nextAnimation = distance > 0.2 ? "walk" : "idle";

        if (animationRef.current !== nextAnimation) {
            characterRef.current?.setAnimation(nextAnimation);
            animationRef.current = nextAnimation;
        }

        if (distance <= 0.2) {
            group.position.y = targetY;
            return;
        }

        const step = Math.min(distance, delta * 2.5);
        group.position.x += (dx / distance) * step;
        group.position.z += (dz / distance) * step;
        group.position.y = targetY;
        group.rotation.y = Math.atan2(dx, dz);
    });

    return (
        <AnimatedModel
            ref={characterRef}
            model="/models/human/onimilio/rigged.glb"
            position={[0, 0, 2]}
            modelOffset={[0, -0.8, 0]}
            animation="idle"
        />
    );
}