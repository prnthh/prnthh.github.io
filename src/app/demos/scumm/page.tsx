"use client";

import { Physics } from "@react-three/rapier";
import { useState, useRef, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Box, OrbitControls } from "@react-three/drei";

import { GameCanvas } from "react-three-game";
import { PrefabRoot } from "react-three-game";
import CutsceneCamera from "@/shared/cameras/CutsceneCamera";

import CombinedController from "@/app/react-three-controller/combined/CombinedController";
import Ped from "@/app/react-three-controller/ped/ped";

import room from "@public/samples/room.json";

const SCUMM_CAMERA_POSITION: [number, number, number] = [0, 0.6, 6];
const SCUMM_CAMERA_TARGET: [number, number, number] = [0, 0, 0];


export default function Home() {
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);
    const characterRef = useRef<any>(null);
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
                    <Physics>
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

                        <CombinedController model={'/models/human/onimilio/rigged.glb'} ref={characterRef} mode={"click"} target={target} />
                        {activeEntity === null && <SidewaysFollowCamera characterRef={characterRef} />}


                        <Ped
                            modelOffset={[0, -0.8, 0]} scale={2.4} height={1.5} position={[2, 0, 2]}
                            model="/models/human/rigga/rigga.glb"
                            onClick={(e) => {
                                setActiveEntity("ped");
                                e.stopPropagation();
                            }}
                        >
                            {activeEntity === "ped" && <CutsceneCamera position={[0, 1, 2]} />}
                        </Ped>
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}

const SidewaysFollowCamera = ({ characterRef }: { characterRef: React.RefObject<any> }) => {
    const orbitRef = useRef<any>(null);
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
        if (orbitRef.current && characterRef.current?.rigidBodyRef?.current) {
            const characterPos = characterRef.current.rigidBodyRef.current.translation();

            // Calculate the offset between character and camera target
            const offset = characterPos.x - targetCameraX.current;

            // Only move camera if character is outside the tolerance zone
            if (Math.abs(offset) > tolerance) {
                // Move camera to keep character at edge of tolerance zone
                if (offset > 0) {
                    targetCameraX.current = characterPos.x - tolerance;
                } else {
                    targetCameraX.current = characterPos.x + tolerance;
                }
            }

            // Smoothly update camera position to follow on x-axis
            camera.position.x += (targetCameraX.current - camera.position.x) * 0.1;

            // Update OrbitControls target to match camera x position
            orbitRef.current.target.x = camera.position.x;
            orbitRef.current.target.y = 0;
            orbitRef.current.target.z = 0;
            orbitRef.current.update();
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