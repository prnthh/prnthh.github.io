import { BallCollider, CapsuleCollider, CuboidCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import React, { memo, useRef, useState, Suspense, useEffect } from "react";
import AnimatedModel from "../../../../../shared/HumanoidModel";
import usePhysicsWalk from "./usePhysicsWalk";
import * as THREE from "three"

const Ped = memo(({ debug, modelUrl, position, lookTarget, height = 0.95, modelOffset, roundHeight = 0.25 }: {
    debug?: boolean,
    modelUrl: string,
    position: [number, number, number] | undefined,
    lookTarget?: React.RefObject<THREE.Object3D | null>,
    height?: number,
    modelOffset?: [number, number, number],
    roundHeight?: number
}) => {
    const [initialPosition, setInitialPosition] = useState<[number, number, number] | undefined>(position);

    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const [animation, setAnimation] = useState<string>("idle");
    const [fallenOver, setFallenOver] = useState<boolean>(false);

    const { isMoving, targetReached } = usePhysicsWalk(
        rigidBodyRef,
        setAnimation,
        position,
        fallenOver,
    );

    return (
        <Suspense fallback={null}>
            <RigidBody
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
                    debug={debug}
                    height={height}
                    modelOffset={modelOffset}
                    lookTarget={lookTarget}
                    onClick={() => {
                        // Handling click
                    }} />
            </RigidBody>
        </Suspense>
    );
});

export default Ped;