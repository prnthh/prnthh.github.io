"use client";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import { Environment, useTexture } from "@react-three/drei";
import { GameCanvas } from "react-three-game";
import { useCanvasReady } from "@/app/sketches/loading/GameWithLoader";
import { Physics, RigidBody } from "@react-three/rapier";
import { NearestFilter, RepeatWrapping, Vector3 } from "three";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import GameComponents from "./GameComponents";
import { Csm } from "@/shared/Csm";


function ReadyNotifier() {
    useCanvasReady();
    return null;
}


export default function GameWrapper() {
    return (
        <Controls>
            <div className="items-center justify-items-center min-h-screen select-none">

                <div className="w-full" style={{ height: "100vh" }}>
                    <GameCanvas>
                        <Csm>

                            <ambientLight intensity={1} />
                            {/* <OrbitControls makeDefault /> */}
                            <Physics debug>
                                <color attach="background" args={['#b5e9ff']} />

                                <GameComponents />
                            </Physics>
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
                    </GameCanvas>
                </div>
            </div>
        </Controls>
    );
}
