
import { useRef, useState, forwardRef, useImperativeHandle, Suspense } from "react";
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
import ModelAttachment from "@/app/react-three-controller/ped/ModelAttachment";
import { Group } from "three";

const CombinedController = forwardRef<RigidHumanoidModelRef, { mode: string, target?: [number, number, number], gunModel?: string, model?: string, basePath?: string }>(({ mode, target = [0, 0, 0], gunModel = "/models/environment/Colt 1911.glb", model = "/models/human/onimilio/rigged.glb", basePath = "/models/human/onimilio/" }, ref) => {
    const [animation, setAnimation] = useState<string>("idle");
    const modelRef = useRef<RigidHumanoidModelRef>(null);
    const cameraRigRef = useRef<Group | null>(null);

    // Forward the internal ref to the parent
    useImperativeHandle(ref, () => modelRef.current as RigidHumanoidModelRef, []);

    const modelProps = {
        basePath,
        model,
        animation,
        height: 0.95,
        position: [0, 0, 0] as [number, number, number],
        shadowOnly: mode === 'first-person',
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

                {mode === 'third-person' && <>
                    <ThirdPersonControls
                        modelRef={modelRef}
                        height={1.2}
                        capsuleRadius={0.25}
                    />
                    <Suspense>
                        <ModelAttachment
                            model={gunModel}
                            attachpoint="mixamorigRightHand"
                            offset={[0, 0, 0]}
                            scale={[10, 10, 10]}
                            rotation={[0, 0, 0]}
                        />
                    </Suspense>

                </>}

                {mode === 'first-person' && <>
                    <FirstPersonControls
                        modelRef={modelRef}
                        height={modelProps.height}
                        eyeHeight={modelProps.height * 0.85}
                        cameraOffset={[0, 0, 0]}
                        cameraRigRef={cameraRigRef}
                        setAnimation={setAnimation}
                    >

                        <FirstPersonArms modelRef={modelRef} gunModel={gunModel} />
                    </FirstPersonControls>
                </>}

            </RigidHumanoidModel>

        </>
    );
});

CombinedController.displayName = "CombinedController";

export default CombinedController;