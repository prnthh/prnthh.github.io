"use client";

import { Physics } from "@react-three/rapier";
import { Box, OrbitControls } from "@react-three/drei";
import { useState } from "react";
import Terrain from "@/shared/ground/ColliderTerrain";
import Ped from "@/shared/ped/physics/ped";
import GameCanvas from "@/shared/GameCanvas";

export default function Home() {
    const [target, setTarget] = useState<[number, number, number]>([0, 5, 0])

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Box position={target} args={[0.1, 0.1, 0.1]} castShadow>
                        <meshBasicMaterial wireframe color="red" />
                    </Box>
                    <Physics>
                        <Ped model={'rigga.glb'} position={target} />
                        <Terrain onClick={(coords: number[]) => {
                            const [x = 0, y = 0, z = 0] = coords;
                            setTarget([x, y, z]);
                        }} />

                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 10]} castShadow />
                        <OrbitControls makeDefault />
                    </Physics>
                </GameCanvas>
            </div>
        </div >
    );
}
