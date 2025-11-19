"use client";

import { Physics } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import Controls from "@/shared/controls/ControlsProvider";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import DemoWorld from "@/shared/DemoWorld";
import GameCanvas from "@/shared/GameCanvas";
import { ThirdPersonController } from "./ThirdPersonController";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        {/* <Perf /> */}
                        <ShadowLight debug camOffset={new Vector3(2, 10, 2)} />

                        <Physics>
                            <ThirdPersonController lookTarget={ballRef} />
                            <DemoWorld />

                        </Physics>
                    </GameCanvas>
                </Controls>
            </div>
        </div >
    );
}