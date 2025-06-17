"use client";

import { Physics } from "@react-three/rapier";
import Controls from "@/shared/ControlsProvider";
import { CharacterController } from "./CharacterController";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import Ground from "../../floor/ground/ground/flat";
import { Canvas } from "@react-three/fiber";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <Canvas shadows>
                        {/* <Perf /> */}
                        <ShadowLight debug camOffset={new Vector3(2, 10, 2)} />

                        <Physics>
                            <CharacterController lookTarget={ballRef} />
                            <Ground />
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div >
    );
}