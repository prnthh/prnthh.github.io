"use client";

import { Physics } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import ImageGround from "@/shared/ground/ImageGround";
import { Canvas } from "@react-three/fiber";
import Controls from "@/shared/controls/ControlsProvider";
import { CharacterController } from "@/shared/shouldercam/CharacterController";
import { ShadowLight } from "@/shared/lighting/ShadowLight";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <Canvas shadows>
                        {/* <Perf /> */}
                        <ShadowLight debug camOffset={new Vector3(2, 10, 2)} />

                        <Physics>
                            <CharacterController lookTarget={ballRef} />
                            <ImageGround />
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div >
    );
}