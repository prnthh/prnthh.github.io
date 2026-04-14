
import { useRef, useState, forwardRef, useImperativeHandle, Suspense } from "react";
import RigidHumanoidModel from "@/app/react-three-controller/ped/physics/RigidHumanoidModel";
import WawaControls from "../wawa/WawaControls";
import SteeringBehavior from "@/app/react-three-controller/ped/physics/SelfSteeringBehavior";
import FollowCam from "@/shared/cameras/FollowCam";
import { RigidHumanoidModelRef } from "@/app/react-three-controller/ped/types";
import ModelAttachment from "@/app/react-three-character/ModelAttachment";
import { Group, Vector3 } from "three";
import ThirdPersonControls, { ThirdPersonControlsRef } from "../thirdperson/ThirdPersonControls";

const CombinedController = forwardRef<RigidHumanoidModelRef, { mode: string, target?: [number, number, number], gunModel?: string, model?: string, basePath?: string }>(({ mode, target = [0, 0, 0], gunModel = "/models/environment/picocad/gunv1.glb", model = "/models/human/onimilio/rigged.glb", basePath = "/models/human/onimilio/" }, ref) => {
    const [animation, setAnimation] = useState<string>("idle");
    const modelRef = useRef<RigidHumanoidModelRef>(null);
    const cameraRigRef = useRef<Group | null>(null);
    const thirdPersonControlsRef = useRef<ThirdPersonControlsRef>(null);
    const thirdPersonWorldPosition = useRef(new Vector3());

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

                {mode === 'third-person' && <>
                    <ThirdPersonControls
                        ref={thirdPersonControlsRef}
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
            </RigidHumanoidModel>

            {mode === 'third-person' && (
                <FollowCam
                    height={1.2 * 0.85}
                    targetOffset={[0, 0, 0]}
                    getTargetState={() => {
                        const targetObject = modelRef.current?.groupRef.current ?? modelRef.current?.modelRef.current;
                        const cameraState = thirdPersonControlsRef.current?.getCameraState();
                        if (!targetObject || !cameraState) return null;

                        targetObject.getWorldPosition(thirdPersonWorldPosition.current);

                        return {
                            position: thirdPersonWorldPosition.current,
                            yaw: cameraState.yaw,
                            pitch: cameraState.pitch,
                            cameraOffset: cameraState.cameraOffset,
                        };
                    }}
                />
            )}

        </>
    );
});

CombinedController.displayName = "CombinedController";

export default CombinedController;