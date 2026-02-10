"use client";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import { useEffect } from "react";
import { useTexture } from "@react-three/drei";
import { GameCanvas } from "react-three-game";
import { Physics, RigidBody } from "@react-three/rapier";
import { NearestFilter, RepeatWrapping, Vector3 } from "three";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import GameComponents from "./GameComponents";

export default function GameWrapper({ onCanvasReady }: { onCanvasReady?: () => void }) {

    useEffect(() => {
        onCanvasReady && onCanvasReady();
    }, []);

    return (
        <Controls>
            <div className="items-center justify-items-center min-h-screen select-none">

                <div className="w-full" style={{ height: "100vh" }}>
                    <GameCanvas>
                        <ambientLight intensity={1} />
                        {/* <OrbitControls makeDefault /> */}
                        <Physics debug>
                            <color attach="background" args={['#b5e9ff']} />

                            <RigidBody type="fixed" colliders="cuboid" position={[0, 0, 0]}>
                                <CheckerboardGround />
                            </RigidBody>

                            <GameComponents />
                            <ShadowLight debug camOffset={new Vector3(2, 10, 2)} />
                        </Physics>
                    </GameCanvas>
                </div>
            </div>
        </Controls>
    );
}

const CheckerboardGround = () => {
    const texture = useTexture("/textures/prototyping_textures_32x32px/Prototype_grey_32x32px.png");

    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(50, 50);
    texture.magFilter = NearestFilter;

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial map={texture} />
        </mesh>
    );
}

