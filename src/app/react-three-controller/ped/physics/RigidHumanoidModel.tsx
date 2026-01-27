import { forwardRef, useImperativeHandle, useRef } from "react";
import { CapsuleCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import { AnimatedModelRef, RigidHumanoidModelProps, RigidHumanoidModelRef } from "../types";

const RigidHumanoidModel = forwardRef<RigidHumanoidModelRef, RigidHumanoidModelProps>(
    (
        {
            position,
            capsuleRadius = 0.25,
            onCollisionEnter,
            ...animatedModelProps
        },
        ref
    ) => {
        const rigidBodyRef = useRef<RapierRigidBody>(null);
        const animatedModelRef = useRef<AnimatedModelRef>(null);

        // Extract height for collider calculation, default to 0.95
        const height = animatedModelProps.height ?? 0.95;

        useImperativeHandle(
            ref,
            () => {
                const meshMethods = animatedModelRef.current as AnimatedModelRef;
                return Object.assign(meshMethods, {
                    rigidBodyRef,
                }) as RigidHumanoidModelRef;
            },
            []
        );

        return (
            <RigidBody
                name={animatedModelProps.name ?? "bob"}
                ref={rigidBodyRef}
                type="dynamic"
                position={position}
                colliders={false}
                linearDamping={0.5}
                angularDamping={0.5}
                lockRotations={true}
                canSleep={false}
            >
                <CapsuleCollider
                    args={[(height - capsuleRadius * 1.9) / 2, capsuleRadius]}
                    position={[0, height / 2, 0]}
                />
                {onCollisionEnter && (
                    <CapsuleCollider
                        args={[(height - capsuleRadius * 1.9) / 2, capsuleRadius]}
                        position={[0, height / 2, 0]}
                        sensor
                        onIntersectionEnter={onCollisionEnter}
                    />
                )}
                <AnimatedModel
                    ref={animatedModelRef}
                    {...animatedModelProps}
                    animationOverrides={{
                        walk: "/models/human/anim/walk.fbx",
                        run: "/models/human/anim/run.fbx",
                        ...animatedModelProps.animationOverrides,
                    }}
                />
            </RigidBody>
        );
    }
);

RigidHumanoidModel.displayName = "RigidHumanoidModel";

export default RigidHumanoidModel;
