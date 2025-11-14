"use client";

import { Physics } from "@react-three/rapier";
import { EnvironmentCube } from "@react-three/drei";
import GameCanvas from "@/shared/GameCanvas";
import useGameStore, { allEntityIDsByType, Entity, getEntitiesByType, useEntityById } from "@/shared/providers/GameStore";
import { useEffect, useRef, } from "react";
import * as THREE from "three";
import DebugCamera from "@/shared/cameras/DebugCamera";
import DraggableDiv from "@/shared/ui/DraggableDiv";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import VisualSection from "./Room";
import SwipeControls from "@/shared/controls/SwipeControls";
import Player from "./Player";
import DialogCollider from "@/shared/ped/DialogCollider";
import CutsceneCamera from "@/shared/cameras/CutsceneCamera";

export default function Home() {
    const playerRef = useRef<{ tap: () => void; getSpeed: () => number }>(null!);
    const speedDisplayRef = useRef<HTMLDivElement>(null);

    const handleTap = () => playerRef.current.tap();

    useEffect(() => {
        const interval = setInterval(() => {
            if (speedDisplayRef.current) {
                speedDisplayRef.current.textContent = `Speed: ${playerRef.current.getSpeed().toFixed(1)}`;
            }
        }, 60);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics gravity={[0, 0, 0]} debug>
                        <ambientLight intensity={0.5} />
                        <directionalLight
                            position={[10, 15, 10]}
                            intensity={5}
                            castShadow
                            shadow-mapSize={[2048, 2048]}
                            shadow-camera-far={50}
                            shadow-camera-left={-15}
                            shadow-camera-right={15}
                            shadow-camera-top={15}
                            shadow-camera-bottom={-15}
                            shadow-bias={-0.001}
                        />
                        <GameEntityWorld playerRef={playerRef} />

                    </Physics>
                    <EnvironmentCube preset="park" />
                </GameCanvas>
                <SwipeControls
                    onTap={handleTap}
                    onSwipeLeft={() => console.log('Swipe Left')}
                    onSwipeRight={() => console.log('Swipe Right')}
                />
            </div>
            <div className="z-20 absolute top-0">
                <DraggableDiv position={[0, 20]}>
                    <div className="bg-black/50 p-2 rounded text-white flex w-[200px] flex-col items-center">
                        <h2 className="font-bold">Demo</h2>
                        <div ref={speedDisplayRef} className="text-sm">Speed: 0.0</div>
                    </div>
                </DraggableDiv>
            </div>
        </div>
    );
}

const randomPickupable = (pos?: [number, number]): Partial<Entity> => {
    const x = pos?.[0] ?? (Math.random() * 10 - 5);
    const z = pos?.[1] ?? (Math.random() * 10 - 5);
    return { type: 'pickupable', position: [x, 0, z] };
}

type RoomVariant = {
    wallColor?: string;
    floorColor?: string;
    width?: number;
    length?: number;
    wallHeight?: number;
    wallThickness?: number;
    height?: number;
}

const ROOM_VARIANTS: RoomVariant[] = [
    { wallColor: "lightgray", floorColor: "gray", width: 5, length: 10, wallHeight: 4, wallThickness: 0.1, height: 1 },
    { wallColor: "#805AD5", floorColor: "#D53F8C", width: 6, length: 12, wallHeight: 4, wallThickness: 0.12, height: 1 },
    { wallColor: "#2C7A7B", floorColor: "#F6E05E", width: 7, length: 8, wallHeight: 5, wallThickness: 0.08, height: 1 },
    { wallColor: "#1A365D", floorColor: "#38B2AC", width: 8, length: 14, wallHeight: 3.5, wallThickness: 0.12, height: 1 }
];

const GameEntityWorld = ({ playerRef: parentPlayerRef }: { playerRef: React.RefObject<{ tap: () => void; getSpeed: () => number }> }) => {
    const playerRef = useRef<THREE.Group>(null!);
    const { addEntity, resetWorld, removeEntity, entities } = useGameStore();
    const initialized = useRef(false);
    const lastAddedZ = useRef(0);

    useEffect(() => {
        if (initialized.current) return;

        resetWorld();

        // Create initial rooms and track the Z position where they end
        let zPosition = 0;

        for (let i = 0; i < 10; i++) {
            const variant = i % ROOM_VARIANTS.length;
            const config = ROOM_VARIANTS[variant];
            const roomLength = config?.length ?? 10;

            addEntity({
                type: 'room',
                variant,
                config,
                position: [0, 0, zPosition] as [number, number, number],
                index: i,
            });

            zPosition += roomLength;
        }

        lastAddedZ.current = zPosition;
        initialized.current = true;

        console.log('Initial rooms created, last Z:', zPosition);
    }, [addEntity, resetWorld]);

    const roomIds = allEntityIDsByType('room');

    return <>
        <Player ref={parentPlayerRef} groupRef={playerRef} />
        {roomIds.map((roomId) => (
            <Encounter key={roomId} roomId={roomId} playerRef={playerRef} />
        ))}
    </>;
}


const Encounter = ({ playerRef, roomId }: { playerRef?: React.RefObject<THREE.Group>, roomId: string }) => {
    const room = useEntityById(roomId);
    const allRooms = allEntityIDsByType('room');

    if (!room) return null;

    const { variant = 0, config, position, index } = room;
    const effectiveWidth = config?.width ?? 5;
    const effectiveLength = config?.length ?? 10;
    const wallHeight = config?.wallHeight ?? 4;
    const wallThickness = config?.wallThickness ?? 0.1;
    const height = config?.height ?? 1;

    // Get previous room for transition walls
    const prevRoomId = index > 0 ? allRooms[index - 1] : null;
    const prevRoom = prevRoomId ? useGameStore.getState().entities.find(e => e.id === prevRoomId) : null;

    return <group position={position}>
        <group >
            <AnimatedModel
                rotation={[0, -Math.PI / 2, 0]}
                position={[2, 0, 3]}
                scale={1.7}
                lookTarget={playerRef}
                basePath={"/models/human/rigga/"}
                model={"rigga.glb"}
                // animation={'walk'}
                animationOverrides={{
                    walk: 'anim/walk.fbx',
                    run: 'anim/run.fbx',
                    jump: 'anim/jump.fbx',
                }}
            />
        </group>
        <group >
            <AnimatedModel
                rotation={[0, Math.PI / 2, 0]}
                position={[-2, 0, 3]}
                scale={1.7}
                lookTarget={playerRef}
                basePath={"/models/human/rigga/"}
                model={"rigga.glb"}
                // animation={'walk'}
                animationOverrides={{
                    walk: 'anim/walk.fbx',
                    run: 'anim/run.fbx',
                    jump: 'anim/jump.fbx',
                }}
            />
        </group>



        <group position={[0, 0, 3]}>
            <DialogCollider
                sceneChildren={<CutsceneCamera position={[-0.2, 2, -2]} rotation={[0.2, Math.PI, 0]} />}
            >
                hello there
            </DialogCollider>
        </group>
        <VisualSection
            position={[0, 0, 0]}
            width={effectiveWidth}
            length={effectiveLength}
            wallHeight={wallHeight}
            wallThickness={wallThickness}
            wallColor={config?.wallColor}
            prevRoom={prevRoom}
        />
        <TiledPlatform
            position={[0, 0, 0]}
            width={effectiveWidth}
            length={effectiveLength}
            height={height}
            floorColor={config?.floorColor}
        />
    </group >
}


const TiledPlatform = ({ position, width = 5, length = 10, height = 1, floorColor = "gray" }: { position: [number, number, number], width?: number, length?: number, height?: number, floorColor?: string }) => {
    // platform is centered on X, sits so top is at y=0, z is centered at length/2
    const yPos = -height / 2;
    const zPos = length / 2;
    return <group position={position}>
        <mesh receiveShadow castShadow position={[0, yPos, zPos]}>
            <boxGeometry args={[width, height, length]} />
            <meshStandardMaterial color={floorColor} />
        </mesh>
    </group>;
};

