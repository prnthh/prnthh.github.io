"use client";

import { Physics } from "@react-three/rapier";
import { useState, useRef, useEffect } from "react";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import { useControls } from 'leva'
import { Box, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Csm } from "@/shared/Csm";
import CombinedController from "../../controllers/combined/CombinedController";
import { PrefabRoot } from "react-three-game";
import DebugGround from "@/shared/ground/DebugGround";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";


export default function Home() {
    const { mode } = useControls({
        mode: { value: 'click', options: ['click', 'wawa', 'tap', 'third-person'] }
    });
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);
    const characterRef = useRef<any>(null);

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

                                <CombinedController ref={characterRef} mode={mode} target={target} />
                                {mode === 'click' && <SidewaysFollowCamera characterRef={characterRef} />}
                            </Csm>
                        </Physics>
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}

const SidewaysFollowCamera = ({ characterRef }: { characterRef: React.RefObject<any> }) => {
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);

    useFrame(() => {
        if (cameraRef.current && characterRef.current?.rbref?.current) {
            const characterPos = characterRef.current.rbref.current.translation();
            // Follow only on x-axis, keep y and z at origin
            cameraRef.current.position.set(characterPos.x, 1, 5);
            // Look straight ahead without rotating (look at a point directly in front)
            cameraRef.current.lookAt(characterPos.x, 0, 0);
        }
    });

    return (
        <PerspectiveCamera
            ref={cameraRef}
            makeDefault
            position={[0, 0, 5]}
        />
    );
}