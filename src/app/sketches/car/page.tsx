"use client";

import { Physics } from "@react-three/rapier";
import Vehicle from "./car/base";
import Lightsource from "@/shared/lighting/lightsource";
import { GameCanvas } from "react-three-game";
import DemoWorld from "@/shared/debug/DemoWorld";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import FollowCam from "@/shared/cameras/FollowCam";
import DriveControls from "./car/DriveControls";
import { useState } from "react";
import { PedCar } from "./PedCar";
import SimpleModel from "@/shared/SimpleModel";
import { Road as TexturedRoad } from "./Road";

const DRIVING_ANIMATION_OVERRIDES = { idle: "/models/human/anim/driving.fbx" };

export default function Home() {
    const [roadData, setRoadData] = useState<{ points: any[], tangents: any[], normals: any[], binormals: any[] } | null>(null);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <DriveControls />
                    <Physics>
                        <DemoWorld position={[0, -1, 0]} />
                        <Lightsource model="/models/environment/lamppost2.glb" position={[-3, -2, 4]} />
                        <Lightsource model="/models/environment/lamppost2.glb" position={[3, -2, 4]} />
                        <Vehicle>
                            <AnimatedModel model="/models/human/milady.glb" animationOverrides={DRIVING_ANIMATION_OVERRIDES} scale={1} rotation={[-Math.PI / 8, 0, 0]} position={[0, -0.3, 0.7]} />
                            <FollowCam height={1.5} />
                        </Vehicle>

                        <TexturedRoad onData={setRoadData} />

                        {roadData && (
                            <>
                                <PedCar {...roadData} speed={1}>
                                    <SimpleModel modelUrl="/models/cars/taxi/car.glb" position={[0, 0, 0]} />
                                </PedCar>
                                <PedCar {...roadData} speed={0.2}>
                                    <SimpleModel modelUrl="/models/cars/taxi/car.glb" position={[0, 0, 0]} />
                                </PedCar>
                            </>
                        )}
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}
