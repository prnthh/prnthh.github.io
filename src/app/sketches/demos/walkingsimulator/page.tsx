"use client";

import { Physics } from "@react-three/rapier";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import { CharacterController } from "../../controllers/shouldercam/CharacterController";
import { GameCanvas } from "@/shared/GameCanvas";
import { Terrain } from "./DSGround";
import { Environment } from "@react-three/drei";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <GameCanvas shadows>
                        {/* <Perf /> */}
                        <ShadowLight debug camOffset={new Vector3(2, 10, 2)} />

                        <Physics>
                            <CharacterController lookTarget={ballRef} />
                            <Terrain />
                            <ambientLight intensity={0.5} />
                        </Physics>
                        <Environment preset="park" background blur={0.5} />
                    </GameCanvas>
                </Controls>
            </div>
        </div >
    );
}
