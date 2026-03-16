"use client";

import { Physics } from "@react-three/rapier";
import { useState } from "react";
import Controls from "../controls/ControlsProvider";
import { GameCanvas } from "react-three-game";
import { useControls } from 'leva'
import { Box, OrbitControls } from "@react-three/drei";
import CombinedController from "./CombinedController";
import { Csm } from "@/shared/Csm";
import DebugGround from "@/shared/ground/DebugGround";
import Playground from "@/shared/debug/Playground";


export default function Home() {
    const { mode } = useControls({
        mode: { value: 'wawa', options: ['click', 'wawa', 'tap', 'third-person', 'first-person'] }
    });
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics>
                            <Csm>
                                <DebugGround onClick={mode === 'click' ? (e) => { setTarget([e.point.x, e.point.y, e.point.z]) } : undefined} />
                                <Playground position={[0, -1, 4]} />
                                <ambientLight intensity={0.5} />

                                {target && mode === 'click' && (
                                    <Box receiveShadow position={target} args={[0.1, 0.1, 0.1]} castShadow />
                                )}
                                {mode === 'click' && <OrbitControls />}

                                <CombinedController mode={mode} target={target} />
                            </Csm>
                        </Physics>
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}