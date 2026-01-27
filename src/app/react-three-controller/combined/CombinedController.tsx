
import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import RigidHumanoidModel from "@/app/react-three-controller/ped/physics/RigidHumanoidModel";
import WawaControls from "../wawa/WawaControls";
import SteeringBehavior from "@/app/react-three-controller/ped/physics/SelfSteeringBehavior";
import SwipeControls from "../controls/SwipeControls";
import useInputStore from "../controls/InputStore";
import TapControls from "../tap/TapControls";
import FollowCam from "@/shared/cameras/FollowCam";
import ThirdPersonControls from "../thirdperson/ThirdPersonControls";
import { RigidHumanoidModelRef } from "@/app/react-three-controller/ped/types";
import FirstPersonControls from "../controls/FirstPersonControls";
import { FirstPersonArms } from "../firstperson/FirstPersonArms";
import { Group } from "three";

const CombinedController = forwardRef<RigidHumanoidModelRef, { mode: string, target?: [number, number, number] }>(({ mode, target = [0, 0, 0] }, ref) => {
    const [animation, setAnimation] = useState<string>("idle");
    const modelRef = useRef<RigidHumanoidModelRef>(null);
    const cameraRigRef = useRef<Group | null>(null);

    // Forward the internal ref to the parent
    useImperativeHandle(ref, () => modelRef.current as RigidHumanoidModelRef, []);

    const modelProps = {
        basePath: "/models/human/onimilio/",
        model: "/models/human/onimilio/rigged.glb",
        animation,
        height: 0.9,
        position: [0, 2, 0] as [number, number, number],
        animationOverrides: {
            idle: '/models/human/onimilio/anim/idle.fbx',
            walk: '/models/human/onimilio/anim/walk.fbx',
            run: '/models/human/onimilio/anim/run.fbx',
            jump: '/models/human/onimilio/anim/jump.fbx',
            walkLeft: "/models/human/onimilio/anim/walkLeft.fbx",
            lpunch: "/models/human/onimilio/anim/lpunch.fbx",
            rpunch: "/models/human/onimilio/anim/rpunch.fbx",
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
                    capsuleRadius={0.25}
                />}

                {mode === 'first-person' && <>
                    <FirstPersonControls
                        modelRef={modelRef}
                        height={modelProps.height}
                        eyeHeight={modelProps.height / 2}
                        cameraOffset={[0, 0, 0]}
                        cameraRigRef={cameraRigRef}
                        setAnimation={setAnimation}
                    >

                        <FirstPersonArms modelRef={modelRef} />
                    </FirstPersonControls>
                </>}

            </RigidHumanoidModel>

        </>
    );
});

CombinedController.displayName = "CombinedController";

export default CombinedController;