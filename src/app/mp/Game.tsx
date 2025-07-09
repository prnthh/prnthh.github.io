"use client";

import React, { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { useRoom } from "./ColyseusProvider";
import { Html, OrbitControls } from "@react-three/drei";
import AnimatedModel from "@/shared/HumanoidModel";
import PlayerModels from "./Player";
import MapEntities from "./MapEntity";

export const CanvasGame = () => {
    const { room, state, isConnected, setOfflineState } = useRoom();
    const [navPointer, setNavPointer] = useState<[number, number, number] | null>(null);
    const [navPointerKey, setNavPointerKey] = useState(0);

    // Handler to set local position on click
    const handleGridClick = useCallback((e: any) => {
        // Get click position in 3D world
        if (!e.point) return;
        setNavPointer([e.point.x, 0, e.point.z]);
        setNavPointerKey((prev) => prev + 1);
        if (room) {
            room.send("command", { text: `walkTo ${e.point.x},${e.point.z}` });
        } else {
            setOfflineState((prev: any) => {
                const newState = { ...prev };
                newState.players.offline.position = { x: e.point.x, y: 0, z: e.point.z };
                return newState;
            });
        }

    }, [room]);

    return <div className="absolute w-screen h-screen">
        <Canvas shadows>
            <WorldMapGrid onClick={handleGridClick} />

            <PlayerModels />
            <MapEntities />

            {navPointer && (
                <Html position={navPointer} className="pointer-events-none">
                    <div className="w-4 h-4 -translate-x-1/2 -translate-y-1/2">
                        <img
                            key={navPointerKey}
                            src={`/ui/click.gif?key=${navPointerKey}`}
                            alt="Nav Pointer"
                            className="w-full z-40"
                        />
                    </div>
                </Html>
            )}


            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <directionalLight position={[5, 5, 5]} castShadow intensity={1} />
            <OrbitControls makeDefault />
        </Canvas>
    </div>
}

const WorldMapGrid = ({ onClick }: { onClick?: (e: any) => void }) => {
    const { isConnected } = useRoom();

    if (!isConnected) return <>
        <mesh position={[0, 0, 0]} scale={[10, 0.1, 10]} receiveShadow onClick={onClick}>
            <boxGeometry />
            <meshStandardMaterial color="darkblue" />
        </mesh>
    </>;


    return <>
        <mesh position={[0, 0, 0]} scale={[20, 0.1, 20]} receiveShadow onClick={onClick}>
            <boxGeometry />
            <meshStandardMaterial color="#fff59c" />
        </mesh>
    </>
}
