"use client";

import { Physics } from "@react-three/rapier";
import { useRef, useState } from "react";
import { Vector3 } from "three";
import Controls from "@/shared/controls/ControlsProvider";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import DemoWorld from "@/shared/debug/DemoWorld";
import GameCanvas from "@/shared/GameCanvas";
import { useControls } from 'leva'
import { Box, OrbitControls } from "@react-three/drei";
import CombinedController from "./CombinedController";


export default function Home() {
    const { mode } = useControls({
        mode: { value: 'click', options: ['click', 'wawa', 'tap', 'third-person'] }
    });
    const [target, setTarget] = useState<[number, number, number]>([0, 5, 0]);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics>
                            <DemoWorld onClick={mode === 'click' ? (e) => { setTarget([e.point.x, e.point.y, e.point.z]) } : undefined} />

                            <ShadowLight debug camOffset={new Vector3(2, 10, 2)} />

                            {target && mode === 'click' && (
                                <Box position={target} args={[0.1, 0.1, 0.1]} castShadow />
                            )}
                            {mode === 'click' && <OrbitControls />}

                            <CombinedController mode={mode} target={target} />
                        </Physics>
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}