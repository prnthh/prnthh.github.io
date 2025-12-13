"use client";

import { Physics } from "@react-three/rapier";
import { useState } from "react";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import { useControls } from 'leva'
import { Box, OrbitControls } from "@react-three/drei";
import { Csm } from "@/shared/Csm";
import CombinedController from "../../controllers/combined/CombinedController";
import { PrefabRoot } from "react-three-game";
import DebugGround from "@/shared/ground/DebugGround";


export default function Home() {
    const { mode } = useControls({
        mode: { value: 'click', options: ['click', 'wawa', 'tap', 'third-person'] }
    });
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics>
                            <Csm>
                                <PrefabRoot
                                    onSelect={(id) => {
                                        console.log("selected prefab root", id);
                                    }}
                                    data={{
                                        id: "scene",
                                        name: "scene",
                                        root: {
                                            id: "root",
                                            components: {
                                                transform: { type: "Transform", properties: { position: [0, 0, 0] } }
                                            },
                                            children: [
                                                {
                                                    id: "ground",
                                                    components: {
                                                        transform: {
                                                            type: "Transform",
                                                            properties: {
                                                                position: [0, -0.7, 0],
                                                                rotation: [-1.57, 0, 0],
                                                                scale: [1, 1, 1]
                                                            }
                                                        },
                                                        geometry: {
                                                            type: "Geometry",
                                                            properties: {
                                                                geometryType: "plane",
                                                                args: [50, 50]
                                                            }
                                                        },
                                                        material: {
                                                            type: "Material",
                                                            properties: {
                                                                color: "white",
                                                                texture: "/textures/GreyboxTextures/greybox_light_grid.png",
                                                                repeat: true,
                                                                repeatCount: [25, 25]
                                                            }
                                                        },
                                                        physics: {
                                                            type: "Physics",
                                                            properties: {
                                                                type: "fixed"
                                                            }
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }} />
                                <ambientLight intensity={0.5} />
                                <DebugGround debug onClick={mode === 'click' ? (e) => { setTarget([e.point.x, e.point.y, e.point.z]) } : undefined} />

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