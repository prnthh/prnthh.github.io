
import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import RigidHumanoidModel from "@/shared/ped/physics/RigidHumanoidModel";
import WawaControls from "../wawa/WawaControls";
import SteeringBehavior, { SteeringType } from "@/shared/ped/physics/SelfSteeringBehavior";
import { RigidHumanoidModelRef } from "@/shared/ped/physics/types";
import SwipeControls from "../controls/SwipeControls";
import useInputStore from "../controls/InputStore";
import TapControls from "../tap/TapControls";
import FollowCam from "@/shared/cameras/FollowCam";
import ThirdPersonControls from "../thirdperson/ThirdPersonControls";

const CombinedController = forwardRef<RigidHumanoidModelRef, { mode: string, target?: [number, number, number] }>(({ mode, target = [0, 0, 0] }, ref) => {
    const [animation, setAnimation] = useState<"idle" | "walk" | "run" | "third-person">("idle");
    const modelRef = useRef<RigidHumanoidModelRef>(null);

    // Forward the internal ref to the parent
    useImperativeHandle(ref, () => modelRef.current as RigidHumanoidModelRef, []);

    const modelProps = {
        basePath: "/models/human/onimilio/",
        model: "rigged.glb",
        animation,
        height: 0.9,
        animationOverrides: {
            idle: 'anim/idle.fbx',
            walk: 'anim/walk.fbx',
            run: 'anim/run.fbx',
            jump: 'anim/jump.fbx',
            walkLeft: "/anim/walkLeft.fbx",
            lpunch: "/anim/lpunch.fbx",
            rpunch: "/anim/rpunch.fbx",
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

                {mode === 'third-person' && <ThirdPersonControls
                    modelRef={modelRef}
                    height={1.2}
                    roundHeight={0.25}
                />}

            </RigidHumanoidModel>

        </>
    );
});

CombinedController.displayName = "CombinedController";

export default CombinedController;