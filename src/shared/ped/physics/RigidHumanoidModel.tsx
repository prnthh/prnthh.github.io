import { CapsuleCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import React, { forwardRef, RefObject, useImperativeHandle, useRef } from "react";
import AnimatedModel from "../HumanoidModel";
import { AnimatedModelRef, } from "../types";
import { RigidHumanoidModelProps, RigidHumanoidModelRef } from "./types";



const RigidHumanoidModel = forwardRef<RigidHumanoidModelRef, RigidHumanoidModelProps>(
    (
        {
            name = "ped",
            debug = false,
            basePath,
            model: modelUrl,
            position,
            lookTarget,
            height = 0.95,
            scale,
            modelOffset,
            roundHeight = 0.25,
            unstable = false,
            animation = "idle",
            animationOverrides = {},
            children,
            rbChildren,
        },
        ref
    ) => {
        const rigidBodyRef = useRef<RapierRigidBody>(null);
        const animatedModelRef = useRef<AnimatedModelRef>(null);

        useImperativeHandle(
            ref,
            () => {
                const meshMethods = animatedModelRef.current as AnimatedModelRef;
                return Object.assign(meshMethods, {
                    rbref: rigidBodyRef,
                }) as RigidHumanoidModelRef;
            },
            []
        );

        return (
            <RigidBody
                name={name}
                ref={rigidBodyRef}
                type="dynamic"
                position={position}
                colliders={false}
                linearDamping={0.5}
                angularDamping={0.5}
                lockRotations={true}
            >
                <CapsuleCollider
                    args={[(height - roundHeight * 1.9) / 2, roundHeight]}
                    position={[0, height / 2, 0]}
                />
                {rbChildren}
                <AnimatedModel
                    ref={animatedModelRef}
                    basePath={basePath}
                    model={modelUrl}
                    animation={animation}
                    name={name}
                    debug={debug}
                    scale={scale}
                    height={height}
                    modelOffset={modelOffset}
                    lookTarget={lookTarget}
                    animationOverrides={{
                        walk: "anim/walk.fbx",
                        run: "anim/run.fbx",
                        ...animationOverrides,
                    }}
                    onClick={() => {
                        // Handling click
                    }}
                >
                    {children}
                </AnimatedModel>
            </RigidBody>
        );
    }
);

RigidHumanoidModel.displayName = "RigidHumanoidModel";

export default RigidHumanoidModel;
