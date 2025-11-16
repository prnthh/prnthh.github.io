"use client";

import { Environment, useTexture } from "@react-three/drei";
import GameCanvas from "@/shared/GameCanvas";
import useGameStore, { allEntityIDsByType, getEntitiesByType } from "@/shared/providers/GameEntityStore";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import SwipeControls from "@/shared/controls/SwipeControls";
import Player from "./Player";
import Room from "./rooms/BaseRoom";
import { useInputStore } from "@/shared/providers/InputStore";
import DebugCamera from "@/shared/cameras/DebugCamera";

// npm i react-brainrot-runner - make a runner game, just provide models for room sections
// use it instead of a loading screen!


export default function Game() {
    const playerRef = useRef<{ tap: () => void; getSpeed: () => number; swipe: (type: 'left' | 'right') => void }>(null!);

    const handleTap = () => useInputStore.getState().tap();
    const handleSwipeLeft = () => useInputStore.getState().swipe('right'); // Swipe left = right punch
    const handleSwipeRight = () => useInputStore.getState().swipe('left'); // Swipe right = left punch


    return <><div className="w-full" style={{ height: "100vh" }}>
        <GameCanvas noLoader>
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
            {/* <fog attach="fog" args={["#ffffff", 25, 30]} /> */}
            {/* <color attach="background" args={["#ffffff"]} /> */}
            <GameEntityWorld playerRef={playerRef} />
        </GameCanvas>
        <SwipeControls onTap={handleTap} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} />
    </div>
    </>
}


type RoomVariant = {
    wallColor?: string;
    floorColor?: string;
    width?: number;
    length?: number;
    wallHeight?: number;
    height?: number;
}

const ROOM_VARIANTS: RoomVariant[] = [
    {},
    {},
    { wallColor: "lightgray", floorColor: "gray", width: 5, length: 10, wallHeight: 4, },
    { wallColor: "#805AD5", floorColor: "#D53F8C", width: 6, length: 12, wallHeight: 5, },
    { wallColor: "#2C7A7B", floorColor: "#F6E05E", width: 7, length: 10, wallHeight: 6, },
    { wallColor: "#1A365D", floorColor: "#38B2AC", width: 8, length: 14, wallHeight: 5, }
];

const GameEntityWorld = ({
    playerRef: parentPlayerRef,
    rooms = ROOM_VARIANTS,
}: {
    playerRef: React.RefObject<{ tap: () => void; getSpeed: () => number; swipe: (type: 'left' | 'right') => void }>,
    rooms?: RoomVariant[],
}) => {
    const playerRef = useRef<THREE.Group>(null!);
    const { addEntity, resetWorld } = useGameStore();
    const initialized = useRef(false);
    const lastAddedZ = useRef(0);

    const INITIAL_ROOMS = 4;
    const nextRoomIndex = useRef(INITIAL_ROOMS);

    useEffect(() => {
        if (initialized.current) return;

        resetWorld();

        let zPosition = 0;

        for (let i = 0; i < INITIAL_ROOMS; i++) {
            const variant = i % rooms.length;
            const config = rooms[variant];
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
    }, [addEntity, resetWorld]);

    // Monitor player position and add rooms dynamically
    useEffect(() => {
        const checkInterval = setInterval(() => {
            if (!playerRef.current) return;

            const playerZ = playerRef.current.position.z;
            const allRooms = getEntitiesByType('room').sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

            if (allRooms.length < 2) return;

            // Add new room when player reaches the second-to-last room
            const secondToLastRoomZ = allRooms[allRooms.length - 2]?.position?.[2] ?? 0;

            if (playerZ >= secondToLastRoomZ) {
                const variant = nextRoomIndex.current % rooms.length;
                const config = rooms[variant];
                const roomLength = config?.length ?? 10;

                addEntity({
                    type: 'room',
                    variant,
                    config,
                    position: [0, 0, lastAddedZ.current] as [number, number, number],
                    index: nextRoomIndex.current,
                });

                lastAddedZ.current += roomLength;
                nextRoomIndex.current += 1;
            }
        }, 200);

        return () => clearInterval(checkInterval);
    }, [addEntity]);

    const roomIds = allEntityIDsByType('room');

    return (
        <>
            <Player ref={parentPlayerRef} groupRef={playerRef} />
            {roomIds.map((roomId) => (
                <Room key={roomId} roomId={roomId} playerRef={playerRef} />
            ))}
            {/* <Chaser /> */}
            <Suspense>
                <CoolRoomEnvironment />
            </Suspense>

        </>
    );
};

const CoolRoomEnvironment = () => {
    const { texture } = useTexture({
        texture: '/textures/skybox1.jpg',
    });
    return <Environment map={texture} />;
};
