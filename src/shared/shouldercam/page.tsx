"use client";

import { Physics } from "@react-three/rapier";
import Controls from "@/shared/controls/ControlsProvider";
import { CharacterController } from "./CharacterController";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import { Canvas } from "@react-three/fiber";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <Canvas shadows>
                        {/* <Perf /> */}

                        <Physics>
                            <CharacterController lookTarget={ballRef} />
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div >
    );
}