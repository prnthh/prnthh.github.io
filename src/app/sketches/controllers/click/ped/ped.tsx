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

    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const [animation, setAnimation] = useState<string>("idle");
    const initialPositionSet = useRef(false);

    // Use a callback ref to set initial position as soon as the rigid body is available
    const setRigidBodyRef = React.useCallback((rb: RapierRigidBody | null) => {
        rigidBodyRef.current = rb;
        if (rb && position && !initialPositionSet.current) {
            rb.setTranslation(new THREE.Vector3(position[0], position[1], position[2]), true);
            initialPositionSet.current = true;
        }
    }, [position]);

    useEffect(() => {
        if (rigidBodyRef.current && position) {
            const rb = rigidBodyRef.current;
            rb.setTranslation(new THREE.Vector3(position[0], position[1], position[2]), true);
        }
    }
        , [rigidBodyRef.current]);

    const { isMoving, targetReached } = usePhysicsWalk(
        rigidBodyRef,
        setAnimation,
        position,
    );

    return (
        <Suspense fallback={null}>
            <RigidBody
                ref={setRigidBodyRef}
                type="dynamic"
                colliders={false}
                linearDamping={0.5}
                angularDamping={0.5}
                enabledRotations={[false, false, false]}
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