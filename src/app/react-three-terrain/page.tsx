"use client";
import { GameCanvas } from "react-three-game";
import { MapProvider } from "./MapProvider";
import { MapTiles } from "./MapTile";
import { OrbitControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useState } from "react";
import { FirstPersonController } from "../react-three-controller";

export default function Page() {
    const [viewRadius, setViewRadius] = useState(2);
    return (
        <div className="w-screen h-screen">
            <MapProvider>
                <GameCanvas>
                    <Physics>
                        <ambientLight intensity={1.5} />
                        <directionalLight position={[10, 10, 5]} intensity={1} />
                        <MapTiles physics tileSize={100} viewRadius={2} />
                        <FirstPersonController />
                        {/* <OrbitControls /> */}
                    </Physics>
                </GameCanvas>
            </MapProvider>
        </div>
    );
}