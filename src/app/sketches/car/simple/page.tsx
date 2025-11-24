"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Environment, OrbitControls, Sky } from "@react-three/drei";
import Vehicle from "./car/base";
import Lightsource from "@/shared/lighting/lightsource";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import DemoWorld from "@/shared/debug/DemoWorld";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import FollowCam from "@/shared/cameras/FollowCam";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics>
                            <DemoWorld position={[0, -1, 0]} />
                            <Lightsource model="/models/environment/lamppost2.glb" position={[-3, -2, 4]} />
                            <Lightsource model="/models/environment/lamppost2.glb" position={[3, -2, 4]} />
                            <Vehicle>
                                <AnimatedModel model="milady.glb" animationOverrides={{ idle: '/anim/driving.fbx' }} scale={1} rotation={[-Math.PI / 8, 0, 0]} position={[0, -0.3, 0.7]} />
                                <FollowCam height={1.5} />
                            </Vehicle>
                        </Physics>
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}
