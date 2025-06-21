import { BallCollider, CapsuleCollider, CuboidCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import React, { memo, useRef, useState, Suspense, useEffect } from "react";
import AnimatedModel from "../../../../../shared/HumanoidModel";
import usePhysicsWalk from "./usePhysicsWalk";
import usePhysicsRecover from "./usePhysicsRecover";
import * as THREE from "three"
import { Html } from "@react-three/drei";

export type PedPropsType = {
    name?: string,
    debug?: boolean,
    modelUrl: string,
    position: [number, number, number] | undefined,
    lookTarget?: React.RefObject<THREE.Object3D | null>,
    height?: number,
    modelOffset?: [number, number, number],
    roundHeight?: number,
    dialog?: React.ReactElement
};

const Ped = memo(({ name = 'alice', debug, modelUrl, position, lookTarget, height = 0.95, modelOffset, roundHeight = 0.25, dialog }: PedPropsType) => {
    const [initialPosition, setInitialPosition] = useState<[number, number, number] | undefined>(position);

    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const [animation, setAnimation] = useState<string>("idle");
    const [fallenOver, setFallenOver] = useState<boolean>(false);

    usePhysicsRecover(rigidBodyRef, setFallenOver, fallenOver);

    const { isMoving, targetReached } = usePhysicsWalk(
        rigidBodyRef,
        setAnimation,
        position,
        fallenOver,
    );

    return (
        <Suspense fallback={null}>
            <RigidBody
                name={name}
                ref={rigidBodyRef}
                type="dynamic"
                position={initialPosition}
                colliders={false}
                linearDamping={0.5}
                angularDamping={0.5}
                lockRotations={!fallenOver}
                onCollisionEnter={(e) => {
                    const otherBody = e.other.rigidBodyObject?.name || "";
                    if (otherBody !== "" && !fallenOver) {
                        setFallenOver(true);
                    }
                }}

            >
                <CapsuleCollider args={[(height - (roundHeight * 1.9)) / 2, roundHeight]} position={[0, (height / 2), 0]} />
                <AnimatedModel model={modelUrl} animation={animation}
                    name={name}
                    debug={debug}
                    height={height}
                    modelOffset={modelOffset}
                    lookTarget={lookTarget}
                    onClick={() => {
                        // Handling click
                    }} />
                {dialog && <Html center position={[0, height * 1.1, 0]}>
                    {dialog}
                </Html>}
            </RigidBody>
        </Suspense>
    );
});

export default Ped;