"use client";

import { Physics } from "@react-three/rapier";
import { Environment } from "@react-three/drei";

import { GameCanvas } from "react-three-game";
import { useCanvasReady } from "@/app/sketches/loading/GameWithLoader";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import CombinedController from "@/app/react-three-controller/combined/CombinedController";

import { Csm } from "@/shared/Csm";
import DebugGround from "@/shared/ground/DebugGround";
import DialogCollider from "@/shared/physics/DialogCollider";

function ReadyNotifier() {
    useCanvasReady();
    return null;
}

export default function HomeGame() {
    return (
        <Controls>
            <GameCanvas>
                <Physics>
                    <Csm>
                        <DebugGround />
                        <ambientLight intensity={0.5} />
                        <CombinedController mode={'wawa'} />

                        <DialogCollider label="omg its prnth.com!" />
                    </Csm>

                    <Environment background frames={1}>
                        <mesh>
                            <sphereGeometry args={[50, 64, 64]} />
                            <meshBasicMaterial
                                color="#87CEEB"
                                side={2}
                                depthWrite={false}
                                fog={false}
                            />
                        </mesh>
                    </Environment>

                    <ReadyNotifier />
                </Physics>
            </GameCanvas>
        </Controls>
    );
}
