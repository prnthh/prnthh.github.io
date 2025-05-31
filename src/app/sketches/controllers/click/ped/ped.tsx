import { BallCollider, CapsuleCollider, CuboidCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import React, { memo, useRef, useState, Suspense, useEffect } from "react";
import AnimatedModel from "../../../../../shared/HumanoidModel";
import usePhysicsWalk from "./usePhysicsWalk";
import * as THREE from "three"

const Ped = memo(({ modelUrl, position, height = 0.95, roundHeight = 0.25 }: {
    modelUrl: string, position: [number, number, number] | undefined,
    height?: number,
    roundHeight?: number
}) => {


    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const [animation, setAnimation] = useState<string>("idle");

    useEffect(() => {
        if (position) {
            rigidBodyRef.current?.setTranslation(new THREE.Vector3(position[0], position[1], position[2]), true);
        }
    }, [rigidBodyRef.current]);

    const { isMoving, targetReached } = usePhysicsWalk(
        rigidBodyRef,
        setAnimation,
        position,
    );

    return (
        <Suspense fallback={null}>
            <RigidBody
                ref={rigidBodyRef}
                type="dynamic"
                colliders={false}
                linearDamping={0.5}
                angularDamping={0.5}
                enabledRotations={[false, false, false]}
            >
                <CapsuleCollider args={[(height - (roundHeight * 1.9)) / 2, roundHeight]} position={[0, (height / 2), 0]} />
                <AnimatedModel model={modelUrl} animation={animation}
                    height={0.95}
                    onClick={() => {
                        // Handling click
                    }} />
            </RigidBody>
        </Suspense>
    );
});

export default Ped;