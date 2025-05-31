"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Box, OrbitControls } from "@react-three/drei";
import { useState } from "react";
import MovableTarget from "@/shared/MovableTarget";
import Ped from "../controllers/click/ped/ped";

export default function Home() {
    const [target, setTarget] = useState<[number, number, number] | undefined>()




    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows>
                    <Physics>
                        <Ped modelUrl={'/models/rigga.glb'} position={target} />
                        <MovableTarget setPosition={setTarget} />


                        <SineWaveTargetFollowingPed />

                        <RigidBody type="fixed">
                            <mesh position={[0, -2, 0]} scale={[10, 0.5, 10]} receiveShadow>
                                <boxGeometry />
                                <meshStandardMaterial color="lightgreen" />
                            </mesh>
                        </RigidBody>
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 10]} castShadow />
                        <OrbitControls makeDefault />
                    </Physics>
                </Canvas>
            </div>
        </div >
    );
}

const SineWaveTargetFollowingPed = () => {
    const [target2, setTarget2] = useState<[number, number, number] | undefined>()

    // Track elapsed time manually using delta
    const [elapsed, setElapsed] = useState(0);

    useFrame((_, delta) => {
        setElapsed((prev) => {
            const next = prev + delta;
            setTarget2([Math.sin(next) * 1.5, 0, Math.cos(next) * 1]);
            return next;
        });
    });

    return (
        <>
            <Ped modelUrl={'/models/rigga2.glb'} position={target2} />
            <Box position={target2} args={[0.1, 0.1, 0.1]}>
                <meshBasicMaterial wireframe color="red" />
            </Box>
        </>
    );
}
