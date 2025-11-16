"use client";

import { Physics } from "@react-three/rapier";
import { Environment, useTexture } from "@react-three/drei";
import GameCanvas from "@/shared/GameCanvas";
import useGameStore, { allEntityIDsByType, getEntitiesByType } from "@/shared/providers/GameEntityStore";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import DraggableDiv from "@/shared/ui/DraggableDiv";
import SwipeControls from "@/shared/controls/SwipeControls";
import Player from "./Player";
import { useInputStore } from "@/shared/providers/InputStore";
import DemoWorld from "@/shared/DemoWorld";

// npm i react-brainrot-runner - make a runner game, just provide models for room sections
// use it instead of a loading screen!

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

                    <CoolRoomEnvironment />
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

const GameEntityWorld = ({
    playerRef: parentPlayerRef,
}: {
    playerRef: React.RefObject<{ tap: () => void; getSpeed: () => number; swipe: (type: 'left' | 'right') => void }>,
}) => {
    const playerRef = useRef<THREE.Group>(null!);
    const { addEntity, resetWorld } = useGameStore();
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;

        resetWorld();

        initialized.current = true;
    }, [addEntity, resetWorld]);

    // Monitor player position and add rooms dynamically
    useEffect(() => {
        const checkInterval = setInterval(() => {
            if (!playerRef.current) return;


        }, 200);

        return () => clearInterval(checkInterval);
    }, [addEntity]);

    return (
        <>
            <Physics gravity={[0, 0, 0]}>
                <Player ref={parentPlayerRef} groupRef={playerRef} />
                <DemoWorld />
            </Physics>
        </>
    );
};

const CoolRoomEnvironment = () => {
    const { texture } = useTexture({
        texture: '/textures/skybox1.jpg',
    });
    return <Environment map={texture} />;
};
