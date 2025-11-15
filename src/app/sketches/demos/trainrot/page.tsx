"use client";

import { Physics } from "@react-three/rapier";
import { Environment } from "@react-three/drei";
import GameCanvas from "@/shared/GameCanvas";
import useGameStore, { allEntityIDsByType, getEntitiesByType } from "@/shared/providers/GameStore";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import DraggableDiv from "@/shared/ui/DraggableDiv";
import SwipeControls from "@/shared/controls/SwipeControls";
import Player from "./Player";
import Room from "./rooms/BaseRoom";
import Chaser from "./Chaser";
import { useInputStore } from "@/shared/firstperson/useInputStore";

export default function Home() {
    const playerRef = useRef<{ tap: () => void; getSpeed: () => number; swipe: (type: 'left' | 'right') => void }>(null!);
    const speedDisplayRef = useRef<HTMLDivElement>(null);

    const handleTap = () => useInputStore.getState().tap();
    const handleSwipeLeft = () => useInputStore.getState().swipe('right'); // Swipe left = right punch
    const handleSwipeRight = () => useInputStore.getState().swipe('left'); // Swipe right = left punch

    useEffect(() => {
        const interval = setInterval(() => {
            if (speedDisplayRef.current) {
                speedDisplayRef.current.textContent = `Speed: ${playerRef.current?.getSpeed?.().toFixed(1)}`;
            }
        }, 60);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics gravity={[0, 0, 0]}>
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
                    <Environment>
                        <mesh>
                            <sphereGeometry args={[50, 32, 32]} />
                            <meshBasicMaterial color="lightblue" side={THREE.BackSide} />
                        </mesh>
                    </Environment>
                </GameCanvas>
                <SwipeControls onTap={handleTap} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} />
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

type RoomVariant = {
    wallColor?: string;
    floorColor?: string;
    width?: number;
    length?: number;
    wallHeight?: number;
    height?: number;
}

const ROOM_VARIANTS: RoomVariant[] = [
    { wallColor: "lightgray", floorColor: "gray", width: 5, length: 10, wallHeight: 4, },
    { wallColor: "#805AD5", floorColor: "#D53F8C", width: 6, length: 12, wallHeight: 4, },
    { wallColor: "#2C7A7B", floorColor: "#F6E05E", width: 7, length: 8, wallHeight: 5, },
    { wallColor: "#1A365D", floorColor: "#38B2AC", width: 8, length: 14, wallHeight: 3.5, }
];

const GameEntityWorld = ({ playerRef: parentPlayerRef }: { playerRef: React.RefObject<{ tap: () => void; getSpeed: () => number; swipe: (type: 'left' | 'right') => void }> }) => {
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
    }, [addEntity, resetWorld]);

    // Monitor player position and add rooms dynamically
    useEffect(() => {
        const checkInterval = setInterval(() => {
            if (!playerRef.current) return;

            const playerZ = playerRef.current.parent?.position.z ?? playerRef.current.getWorldPosition(new THREE.Vector3()).z;
            const allRooms = getEntitiesByType('room').sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

            if (allRooms.length < 2) return;

            // Add new room when player reaches the second-to-last room
            const secondToLastRoomZ = allRooms[allRooms.length - 2]?.position?.[2] ?? 0;

            if (playerZ >= secondToLastRoomZ) {
                const variant = nextRoomIndex.current % ROOM_VARIANTS.length;
                const config = ROOM_VARIANTS[variant];
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
        </>
    );
};
