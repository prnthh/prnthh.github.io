import { BallCollider, CapsuleCollider, CuboidCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import React, { memo, useRef, useState, Suspense, useEffect } from "react";
import usePhysicsWalk from "./usePhysicsWalk";
import usePhysicsRecover from "./usePhysicsRecover";
import * as THREE from "three"
import { Html } from "@react-three/drei";
import AnimatedModel from "./HumanoidModel";

export type PedPropsType = {
    name?: string,
    debug?: boolean,
    modelUrl: string,
    basePath?: string,
    position: [number, number, number] | undefined,
    lookTarget?: React.RefObject<THREE.Object3D | null>,
    height?: number,
    scale?: number,
    modelOffset?: [number, number, number],
    roundHeight?: number,
    unstable?: boolean,
    children?: React.ReactNode,
};

const Ped = memo(({ name = 'alice', debug, basePath, modelUrl, position, lookTarget, height = 0.95, scale, modelOffset, roundHeight = 0.25, unstable, children }: PedPropsType) => {
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
                        if (unstable) setFallenOver(true);
                    }
                }}

            >
                <CapsuleCollider args={[(height - (roundHeight * 1.9)) / 2, roundHeight]} position={[0, (height / 2), 0]} />
                <AnimatedModel basePath={basePath} model={modelUrl} animation={animation}
                    name={name}
                    debug={debug}
                    scale={scale}
                    height={height}
                    modelOffset={modelOffset}
                    lookTarget={lookTarget}
                    animationOverrides={{
                        walk: 'anim/walk.fbx',
                        run: 'anim/run.fbx',
                    }}
                    onClick={() => {
                        // Handling click
                    }} />
                {children}
            </RigidBody>
        </Suspense>
    );
});

export default Ped;