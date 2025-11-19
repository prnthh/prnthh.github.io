
import { useRef, useState } from "react";
import RigidHumanoidModel from "@/shared/ped/physics/RigidHumanoidModel";
import WawaControls from "../wawa/WawaControls";
import SteeringBehavior, { SteeringType } from "@/shared/ped/physics/SelfSteeringBehavior";
import { RigidHumanoidModelRef } from "@/shared/ped/physics/types";
import SwipeControls from "@/shared/controls/SwipeControls";
import useInputStore from "@/shared/providers/InputStore";
import TapControls from "../tap/TapControls";
import FollowCam from "@/shared/cameras/FollowCam";

export default function CombinedController({ mode, target = [0, 0, 0] }: { mode: string, target?: [number, number, number] }) {
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

                {mode === 'tap' && <>
                    <TapControls
                        modelRef={modelRef}
                        setAnimation={setAnimation}
                    />
                    <SwipeControls
                        onTap={() => useInputStore.getState().tap()}
                        onSwipeLeft={() => useInputStore.getState().swipe('right')}
                        onSwipeRight={() => useInputStore.getState().swipe('left')}
                    />
                    <FollowCam height={2.5} />
                </>}

            </RigidHumanoidModel>

        </>
    );
}