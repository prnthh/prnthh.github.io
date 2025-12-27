/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { RapierRigidBody } from "@react-three/rapier";
import { useRef, RefObject } from "react";
import { Group, Object3D } from "three";

import RigidHumanoidModel from "../ped/physics/RigidHumanoidModel";
import ThirdPersonControls from "./ThirdPersonControls";
import { RigidHumanoidModelRef } from "../ped/types";

export const ThirdPersonController = ({
    position = [0, 2, 0],
    lookTarget,
    name = 'bob',
    children,
    forwardRef
}: {
    position?: [number, number, number],
    lookTarget?: RefObject<Object3D | null>
    name?: string,
    children?: React.ReactNode,
    forwardRef?: (refs: { rigidBodyRef: RefObject<RapierRigidBody | null>, meshref: RefObject<Group | null>, cameraRigRef: RefObject<Group | null> }) => void
}) => {
    const height = 1.2, capsuleRadius = 0.25;
    const modelRef = useRef<RigidHumanoidModelRef>(null);

    return (
        <RigidHumanoidModel
            ref={modelRef}
            position={position}
            name={name}
            basePath="/models/human/onimilio/"
            model="rigged.glb"
            height={height}
            capsuleRadius={capsuleRadius}
            lookTarget={lookTarget}
            animationOverrides={{
                walk: 'anim/walk.fbx',
                run: 'anim/run.fbx',
                jump: 'anim/jump.fbx',
                walkLeft: "/anim/walkLeft.fbx",
                lpunch: "/anim/lpunch.fbx",
                rpunch: "/anim/rpunch.fbx",
            }}
        >
            {children}
            <ThirdPersonControls
                modelRef={modelRef}
                height={height}
                capsuleRadius={capsuleRadius}
                lookTarget={lookTarget}
            />
        </RigidHumanoidModel>
    );
};
