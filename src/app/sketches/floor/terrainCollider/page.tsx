"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Box, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useState } from "react";
import MovableTarget from "@/shared/MovableTarget";
import { Terrain } from "./terrain";

export default function Home() {
    const [target, setTarget] = useState<[number, number, number] | undefined>()

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows>
                    <Box position={target} args={[0.1, 0.1, 0.1]} castShadow>
                        <meshBasicMaterial wireframe color="red" />
                    </Box>
                    <Physics>
                        <Terrain onClick={(coords: number[]) => {
                            const [x = 0, y = 0, z = 0] = coords;
                            setTarget([x, y, z]);
                        }} />

                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 10]} castShadow />
                        <OrbitControls makeDefault />
                    </Physics>
                    <PerspectiveCamera makeDefault position={[0, 20, 30]} fov={50} />
                </Canvas>
            </div>
        </div >
    );
}
