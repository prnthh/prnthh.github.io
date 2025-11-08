import { BallCollider, CapsuleCollider, CuboidCollider, RapierCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import React, { memo, useRef, useState, Suspense, useEffect, RefObject } from "react";
import usePhysicsRecover from "./usePhysicsRecover";
import * as THREE from "three"
import { Html } from "@react-three/drei";
import AnimatedModel from "./HumanoidModel";
import SteeringBehavior, { SteeringType } from "./useSteeringBehavior";

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
    steeringType?: SteeringType,
    unstable?: boolean,
    onDestinationReached?: RefObject<() => void>,
    animationOverrides?: { [key: string]: string },
    children?: React.ReactNode,
    forwardRef?: (refs: { rbref: RefObject<RapierRigidBody | null>, meshref: RefObject<THREE.Group | null> }) => void
};

const Ped = memo(({ name = 'alice', debug, basePath, modelUrl, position, lookTarget, height = 0.95, scale, modelOffset, roundHeight = 0.25, steeringType = SteeringType.RUN, unstable, onDestinationReached, animationOverrides = {}, children, forwardRef }: PedPropsType) => {
    const [initialPosition,] = useState<[number, number, number] | undefined>(position);

    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const [animation, setAnimation] = useState<string>("idle");
    const [fallenOver, setFallenOver] = useState<boolean>(false);

    const container = useRef<THREE.Group>(null);
    useEffect(() => {
        if (typeof forwardRef === 'function') {
            forwardRef({ rbref: rigidBodyRef, meshref: container });
        }
    }, [forwardRef]);

    // usePhysicsRecover(rigidBodyRef, setFallenOver, fallenOver);

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
                        ...animationOverrides,
                    }}
                    onClick={() => {
                        // Handling click
                    }} />
                {children}
                <SteeringBehavior
                    type={steeringType}
                    rigidBodyRef={rigidBodyRef}
                    setAnimation={setAnimation}
                    position={position}
                    paused={fallenOver}
                    onDestinationReached={onDestinationReached}
                />

            </RigidBody>
        </Suspense>
    );
});

export default Ped;