"use client";

import { Physics } from "@react-three/rapier";
import { useRef, useState } from "react";
import { Vector3 } from "three";
import Controls from "@/shared/controls/ControlsProvider";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import DemoWorld from "@/shared/DemoWorld";
import GameCanvas from "@/shared/GameCanvas";
import { useControls } from 'leva'
import { Box, OrbitControls } from "@react-three/drei";
import RigidHumanoidModel from "@/shared/ped/physics/RigidHumanoidModel";
import WawaControls from "../wawa/WawaControls";
import SteeringBehavior, { SteeringType } from "@/shared/ped/physics/SelfSteeringBehavior";
import { RigidHumanoidModelRef } from "@/shared/ped/physics/types";
import SwipeControls from "@/shared/controls/SwipeControls";
import { useInputStore } from "@/shared/providers/InputStore";
import TapControls from "../tap/TapControls";
import { FollowCam } from "@/shared/cameras/FollowCam";


function Scene({ mode }: { mode: string }) {
    const [target, setTarget] = useState<[number, number, number]>([0, 5, 0]);
    const [animation, setAnimation] = useState<"idle" | "walk" | "run">("idle");
    const modelRef = useRef<RigidHumanoidModelRef>(null);

    const modelProps = {
        basePath: "/models/human/onimilio/",
        model: "rigged.glb",
        animation,
        height: 0.9,
        animationOverrides: {
            idle: 'anim/idle.fbx',
            walk: 'anim/walk.fbx',
            run: 'anim/run.fbx',
        }
    };

    return (
        <>
            <ShadowLight debug camOffset={new Vector3(2, 10, 2)} />

            {target && mode === 'click' && (
                <Box position={target} args={[0.1, 0.1, 0.1]} castShadow />
            )}

            <Physics>
                <DemoWorld onClick={mode === 'click' ? (e) => { setTarget([e.point.x, e.point.y, e.point.z]) } : undefined} />

                <RigidHumanoidModel
                    ref={modelRef}
                    {...modelProps}
                >
                    {mode === 'wawa' && (
                        <WawaControls
                            modelRef={modelRef}
                            setAnimation={setAnimation}
                            walkSpeed={1}
                            runSpeed={2.2}
                            rotationSpeed={0.01}
                        />
                    )}

                    {mode === 'click' && (
                        <SteeringBehavior
                            type={SteeringType.WALK}
                            rigidBodyRef={modelRef}
                            setAnimation={setAnimation}
                            position={target}
                            paused={false}
                        />
                    )}

                    {mode === 'tap' && (
                        <TapControls
                            modelRef={modelRef}
                            setAnimation={setAnimation}
                        />
                    )}

                    {mode === 'tap' && <> <SwipeControls
                        onTap={() => useInputStore.getState().tap()}
                        onSwipeLeft={() => useInputStore.getState().swipe('right')}
                        onSwipeRight={() => useInputStore.getState().swipe('left')}
                    />
                        <FollowCam height={2.5} />
                    </>}
                </RigidHumanoidModel>

                {mode === 'click' && <OrbitControls />}
            </Physics>
        </>
    );
}

export default function Home() {
    const { mode } = useControls({
        mode: { value: 'click', options: ['click', 'wawa', 'tap'] }
    });

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Scene mode={mode} />
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}