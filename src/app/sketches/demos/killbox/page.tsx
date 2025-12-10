"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import GameCanvas from "@/shared/GameCanvas";
import { Joystick, Button } from "@/shared/controls/TouchscreenControls";
import MultiplayerProvider from "@/shared/multiplayer/TrysteroMultiplayerProvider";
import OtherPlayers from "@/shared/multiplayer/OtherPlayers";
import LocalPlayer from "@/shared/multiplayer/LocalPlayer";
import { Html } from "@react-three/drei";
import { useTimeRNGNumber } from "./TimeRNG";
import Balloon from "@/shared/physics/Balloon";
import { PrefabRoot, Prefab } from "react-three-game";
import killbox from "../../tools/prefabeditor/samples/killbox.json";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import Ragdoll from "@/shared/physics/Ragdoll";
import HitBox from "@/shared/physics/HitBox";
import Ped from "@/shared/ped/physics/ped";
import DialogCollider from "@/shared/ped/physics/DialogCollider";
import ModelAttachment from "@/shared/ped/ModelAttachment";

export default function Home() {
    const handleTap = () => {
        // Check if we're on mobile and not already in fullscreen
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                elem.requestFullscreen?.() ||
                    (elem as any).webkitRequestFullscreen?.() ||
                    (elem as any).mozRequestFullScreen?.() ||
                    (elem as any).msRequestFullscreen?.();
            }
        }
    };

    return (
        <div className="items-center justify-items-center min-h-screen select-none" onClick={handleTap}>
            <div className="w-full" style={{ height: "100vh" }}>
                <MultiplayerProvider roomId="lobby" debug={false}>
                    <GameCanvas>
                        <Physics>
                            <PrefabRoot data={killbox as Prefab} />
                            <Train />
                            <Ragdoll />

                            <RandomNumberExample />

                            <Balloon position={[0, 2, -5]} />

                            <HitBox debug key={2} position={[1, 1, 4]} />
                            <HitBox debug key={3} position={[2, 1, 4]} />
                            <HitBox debug key={4} position={[3, 1, 4]} />
                            <Balloon position={[2, 3, 4]} />

                            <Ped unstable modelOffset={[0, -0.5, 0]} position={[3, 0, 3]} model="/rigga/rigga2.glb">
                                <DialogCollider radius={3} height={1.2}>Ah hello</DialogCollider>
                                <ModelAttachment
                                    model="/models/environment/Katana.glb"
                                    attachpoint="mixamorigRightHand"
                                    offset={[2, 0, 0]}
                                    scale={[100, 100, 100]}
                                    rotation={[0.7, 0, -1]}
                                />
                            </Ped>

                            <LocalPlayer />
                            <OtherPlayers />
                        </Physics>
                        <ambientLight intensity={1} />
                        <directionalLight castShadow position={[10, 10, 5]} intensity={1} />
                    </GameCanvas>
                </MultiplayerProvider>
            </div>
            <div className='absolute bottom-10 left-10 z-50 text-white select-none'>
                <Joystick horizontalAxis='horizontal' verticalAxis='vertical' />
            </div>
            <div className='absolute bottom-10 right-10 z-50 text-white select-none flex gap-x-4'>
                {/* twinstick */}
                {/* <ControllerJoystick horizontalAxis='lookHorizontal' verticalAxis='lookVertical' /> */}
                <Button button="fire" />
                <Button button="jump" />
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-1/2">
                +
            </div>
        </div>
    );
}

const Train = ({ position = [10, 0, -10] }: { position?: [number, number, number] }) => {
    const rbRef = useRef<RapierRigidBody>(null);
    const goingUp = useRef(false);
    const waitTime = useRef(0);

    useFrame((_, delta) => {
        if (!rbRef.current) return;

        const currentY = rbRef.current.translation().y;

        // Check if we've reached an end
        if ((currentY >= 9 && goingUp.current) || (currentY <= 0 && !goingUp.current)) {
            // Stop and wait
            rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            waitTime.current += delta;

            // After 5 seconds, switch direction
            if (waitTime.current >= 5) {
                goingUp.current = !goingUp.current;
                waitTime.current = 0;
            }
        } else if (waitTime.current === 0) {
            // Moving
            rbRef.current.setLinvel({ x: 0, y: goingUp.current ? 10 : -10, z: 0 }, true);
        }
    });

    return <RigidBody ref={rbRef} type='kinematicVelocity' position={position}>
        <mesh castShadow>
            <boxGeometry args={[4, 0.1, 8]} />
            <meshStandardMaterial color="red" />
        </mesh>
    </RigidBody>
}

const RandomNumberExample = () => {
    const randomNum = useTimeRNGNumber({ min: 0, max: 100 });
    const randomNum2 = useTimeRNGNumber({ min: 0, max: Math.PI * 2, seedOffset: 42 });

    return <>
        <Html transform className="flex gap-x-2" position={[0, 2, -4]}>
            <div className="">
                {randomNum.toFixed()}
            </div>
            <div className="">
                {randomNum2.toFixed()}
            </div>
        </Html>
    </>
}