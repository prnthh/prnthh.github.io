"use client";

import { Physics } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import { Canvas } from "@react-three/fiber";
import { ThirdPersonController } from "@/app/sketches/controllers/thirdperson/ThirdPersonController";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows>
                    {/* <Perf /> */}

                    <Physics>
                        <ThirdPersonController lookTarget={ballRef} />
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} />
                    </Physics>
                </Canvas>
            </div>
        </div >
    );
}