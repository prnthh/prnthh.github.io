/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import { CapsuleCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useEffect, useRef, useState, useCallback } from "react";
import { Group } from "three";
import FirstPersonControls from "./FirstPersonControls";
import { Weapon, Gun } from "./Weapon";

const PLAYER_MASS = 70;

const FirstPersonController = ({
    name = "bob",
    height = 1,
    cameraOffset = [0, 0, 0],
    spawnPosition = [0, 2, 0],
    children,
    forwardRef,
    onFire
}: {
    name?: string,
    height?: number,
    cameraOffset?: [number, number, number],
    spawnPosition?: [number, number, number],
    children?: React.ReactNode,
    forwardRef?: (refs: { rigidBodyRef: React.RefObject<RapierRigidBody | null>, meshref: React.RefObject<Group | null>, cameraRigRef: React.RefObject<Group | null> }) => void,
    onFire?: () => void
}) => {
    const rigidBodyRef = useRef<RapierRigidBody | null>(null);
    const bodyMeshRef = useRef<Group | null>(null);
    const cameraRigRef = useRef<Group | null>(null);
    const [isFlashing, setIsFlashing] = useState(false);

    const CAPSULE_RADIUS = height / 5;
    const CAPSULE_HEIGHT = height / 2;
    const EYE_HEIGHT = CAPSULE_HEIGHT;

    const handleFire = useCallback(() => {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 100);
        onFire?.();
    }, [onFire]);

    useEffect(() => {
        if (typeof forwardRef === 'function') {
            forwardRef({ rigidBodyRef, meshref: bodyMeshRef, cameraRigRef });
        }
    }, [forwardRef]);

    return (
        <RigidBody
            name={name}
            ccd
            position={spawnPosition}
            colliders={false}
            ref={rigidBodyRef}
            type="dynamic"
            mass={PLAYER_MASS}
            angularDamping={1}
            linearDamping={0}
            enabledRotations={[false, false, false]}
        >
            <CapsuleCollider args={[CAPSULE_HEIGHT, CAPSULE_RADIUS]} />
            <group ref={bodyMeshRef} position={[0, -(CAPSULE_HEIGHT + CAPSULE_RADIUS), 0]} rotation={[0, Math.PI, 0]}>
                {children}
            </group>
            {!children && <mesh castShadow onBeforeRender={() => { }}>
                <capsuleGeometry args={[CAPSULE_RADIUS, height, 8, 16]} />
                <meshStandardMaterial color="orange" />
            </mesh>}

            <FirstPersonControls
                rigidBodyRef={rigidBodyRef}
                height={CAPSULE_HEIGHT}
                eyeHeight={EYE_HEIGHT}
                cameraOffset={cameraOffset}
                cameraRigRef={cameraRigRef}
            >
                <group position={[0.2, -0.2, -0.5]} scale={0.5}>
                    <Gun isFlashing={isFlashing} />
                    <Weapon excludeRigidBody={rigidBodyRef} onFire={handleFire} />
                </group>
            </FirstPersonControls>
        </RigidBody>
    );
};

export default FirstPersonController;