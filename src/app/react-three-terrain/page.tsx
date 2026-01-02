"use client";
import { GameCanvas } from "react-three-game";
import { MapProvider } from "./MapProvider";
import { MapTiles } from "./MapTile";
import { Box, OrbitControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useRef, useState } from "react";
import { FirstPersonController } from "../react-three-controller";
import { DemoEnvironment } from "@/shared/debug/DemoWorld";

export default function Page() {
    const [editMode, setEditMode] = useState(true);
    const [pointer, setPointer] = useState<[number, number, number] | null>(null);
    return (
        <div className="w-screen h-screen">
            <MapProvider>
                <GameCanvas>
                    <Physics>
                        <ambientLight intensity={1.5} />
                        <directionalLight position={[10, 10, 5]} intensity={1} />
                        <MapTiles startX={-1} startZ={-1} endX={1} endZ={1} physics tileSize={100} viewRadius={2} />

                        {editMode ? <>
                            <OrbitControls />
                            <Box position={pointer || [0, 0, 0]} args={[1, 1, 1]}>
                                <meshStandardMaterial color="red" />
                            </Box>
                        </> : <>
                            <FirstPersonController spawnPosition={[20, 10, 20]} />
                            <DemoEnvironment />
                        </>}
                    </Physics>
                </GameCanvas>
            </MapProvider>
        </div>
    );
}