/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { forwardRef, Suspense, useImperativeHandle, useRef, useState, RefObject } from "react";
import { Object3D, Vector3 } from "three";

import ModelAttachment from "@/app/react-three-character/ModelAttachment";
import FollowCam from "@/shared/cameras/FollowCam";

import RigidHumanoidModel from "../ped/physics/RigidHumanoidModel";
import NeoControls, { NeoControlsRef } from "./NeoControls";
import { RigidHumanoidModelRef } from "../ped/types";

const FIRST_PERSON_DISTANCE = 0;
const DEFAULT_CAMERA_DISTANCE = 4;

interface NeoControllerProps {
    position?: [number, number, number],
    lookTarget?: RefObject<Object3D | null>
    name?: string,
    model?: string,
    basePath?: string,
    gunModel?: string,
    height?: number,
    modelOffset?: [number, number, number],
    capsuleRadius?: number,
    children?: React.ReactNode
}

export const NeoController = forwardRef<RigidHumanoidModelRef, NeoControllerProps>(function NeoController({
    position = [0, 2, 0] as [number, number, number],
    lookTarget,
    name = 'bob',
    model = "/models/human/onimilio/rigged.glb",
    basePath = "/models/human/onimilio/",
    gunModel = "/models/environment/picocad/gunv1.glb",
    height = 1.2,
    modelOffset = [0, 0, 0] as [number, number, number],
    capsuleRadius = 0.25,
    children
}, ref) {
    const modelRef = useRef<RigidHumanoidModelRef>(null);
    const neoControlsRef = useRef<NeoControlsRef>(null);
    const neoWorldPosition = useRef(new Vector3());
    const [cameraDistance, setCameraDistance] = useState(DEFAULT_CAMERA_DISTANCE);
    const shadowOnly = cameraDistance <= FIRST_PERSON_DISTANCE;

    useImperativeHandle(ref, () => modelRef.current as RigidHumanoidModelRef, []);

    return (
        <>
            <RigidHumanoidModel
                ref={modelRef}
                position={position}
                name={name}
                basePath={basePath}
                model={model}
                height={height}
                modelOffset={modelOffset}
                capsuleRadius={capsuleRadius}
                lookTarget={lookTarget}
                shadowOnly={shadowOnly}
                animationOverrides={{
                    idle: '/models/human/onimilio/anim/idle.fbx',
                    walk: '/models/human/onimilio/anim/walk.fbx',
                    run: '/models/human/onimilio/anim/run.fbx',
                    jump: '/models/human/onimilio/anim/jump.fbx',
                    walkLeft: "/models/human/onimilio/anim/walkLeft.fbx",
                    lpunch: "/models/human/onimilio/anim/lpunch.fbx",
                    rpunch: "/models/human/onimilio/anim/rpunch.fbx",
                }}
            >
                {children}
                <NeoControls
                    ref={neoControlsRef}
                    modelRef={modelRef}
                    cameraDistance={cameraDistance}
                    onCameraDistanceChange={setCameraDistance}
                />
                {!shadowOnly && (
                    <Suspense>
                        <ModelAttachment
                            model={gunModel}
                            attachpoint="mixamorigRightHand"
                            offset={[10, 10, 0]}
                            scale={[10, 10, 10]}
                            rotation={[-3, -1, -1]}
                        />
                    </Suspense>
                )}
            </RigidHumanoidModel>

            <FollowCam
                height={height * 0.85}
                targetOffset={shadowOnly ? [0, 0, 3] : [0, 0, 0]}
                getTargetState={() => {
                    const targetObject = modelRef.current?.groupRef.current ?? modelRef.current?.modelRef.current;
                    const cameraState = neoControlsRef.current?.getCameraState();
                    if (!targetObject || !cameraState) return null;

                    targetObject.getWorldPosition(neoWorldPosition.current);

                    return {
                        position: neoWorldPosition.current,
                        yaw: cameraState.yaw,
                        pitch: cameraState.pitch,
                        cameraOffset: cameraState.cameraOffset,
                    };
                }}
            />
        </>
    );
});

NeoController.displayName = "NeoController";
