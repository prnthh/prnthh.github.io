/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import { RapierRigidBody, useRapier } from "@react-three/rapier";
import { useRef, RefObject } from "react";
import { Vector3, Quaternion, MathUtils, Group } from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import PointerLockControls from "@/shared/controls/PointerLockControls";
import useInputStore from "@/shared/providers/InputStore";
import KeyboardControls from "@/shared/controls/KeyboardControls";

const tempQuat = new Quaternion();
const tempYawQuat = new Quaternion();
const tempForward = new Vector3();
const tempRight = new Vector3();
const tempDirection = new Vector3();
const tempRayOrigin = new Vector3();

const PITCH_LIMIT = Math.PI / 2;
const MOUSE_SENSITIVITY = 0.002;
const JOYSTICK_SENSITIVITY = 2.5;

interface FirstPersonControlsProps {
    rigidBodyRef: RefObject<RapierRigidBody | null>;
    height: number;
    eyeHeight: number;
    cameraOffset?: [number, number, number];
    walkSpeed?: number;
    sprintSpeed?: number;
    jumpVelocity?: number;
    floatSpring?: number;
    floatDamping?: number;
    cameraRigRef?: RefObject<Group | null>;
    children?: React.ReactNode;
}

const FirstPersonControls = ({
    rigidBodyRef,
    height,
    eyeHeight,
    cameraOffset = [0, 0, 0],
    walkSpeed = 5,
    sprintSpeed = 12,
    jumpVelocity = 5,
    floatSpring = 8,
    floatDamping = 0.3,
    cameraRigRef: providedCameraRigRef,
    children,
}: FirstPersonControlsProps) => {
    const internalCameraRigRef = useRef<Group | null>(null);
    const cameraRigRef = providedCameraRigRef || internalCameraRigRef;
    const cameraPitch = useRef(0);
    const { setButton } = useInputStore()

    // Shared look logic - processes movement deltas directly
    const applyLookDelta = (dx: number, dy: number) => {
        const rb = rigidBodyRef.current;
        if (!rb) return;

        const yawDelta = -dx * MOUSE_SENSITIVITY;
        const rot = rb.rotation();
        tempQuat.set(rot.x, rot.y, rot.z, rot.w);
        tempYawQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, yawDelta);
        tempQuat.premultiply(tempYawQuat);
        rb.setRotation(tempQuat, true);

        cameraPitch.current = MathUtils.clamp(
            cameraPitch.current - dy * MOUSE_SENSITIVITY,
            -PITCH_LIMIT,
            PITCH_LIMIT
        );

        if (cameraRigRef.current) {
            cameraRigRef.current.rotation.x = cameraPitch.current;
        }
    };

    return (
        <>
            <group name='cameraRig' position={[0, eyeHeight, 0]} ref={cameraRigRef}>
                <group name='camera' position={cameraOffset}>
                    <PerspectiveCamera makeDefault />
                </group>
                {children}
            </group>

            <KeyboardControls />
            <MovementSystem
                height={height}
                rigidBodyRef={rigidBodyRef}
                walkSpeed={walkSpeed}
                sprintSpeed={sprintSpeed}
                jumpVelocity={jumpVelocity}
                floatSpring={floatSpring}
                floatDamping={floatDamping}
            />
            <LookSystem
                rigidBodyRef={rigidBodyRef}
                cameraRigRef={cameraRigRef}
                cameraPitch={cameraPitch}
            />
            <PointerLockControls onLook={applyLookDelta} />
        </>
    );
};

export default FirstPersonControls;

export const MovementSystem = ({
    height = 0.5,
    rigidBodyRef,
    walkSpeed = 5,
    sprintSpeed = 12,
    jumpVelocity = 5,
    floatSpring = 8,
    floatDamping = 0.3,
}: {
    height?: number;
    rigidBodyRef: RefObject<RapierRigidBody | null>;
    walkSpeed?: number;
    sprintSpeed?: number;
    jumpVelocity?: number;
    floatSpring?: number;
    floatDamping?: number;
}) => {
    const horizontal = useInputStore(state => state.horizontal);
    const vertical = useInputStore(state => state.vertical);
    const sprint = useInputStore(state => state.sprint);
    const jump = useInputStore(state => state.jump);
    const rapier = useRapier();

    const velocityRef = useRef({ x: 0, y: 0, z: 0 });
    const dirtyRef = useRef(false);

    useFrame(() => {
        const rb = rigidBodyRef.current;
        if (!rb) return;

        const vel = rb.linvel();
        velocityRef.current.x = vel.x;
        velocityRef.current.y = vel.y;
        velocityRef.current.z = vel.z;
        dirtyRef.current = false;
        const currentSpeed = sprint ? sprintSpeed : walkSpeed;

        const pos = rb.translation();
        tempRayOrigin.set(pos.x, pos.y - height, pos.z);
        const ray = new rapier.rapier.Ray(tempRayOrigin, { x: 0, y: -1, z: 0 });
        const hit = rapier.world.castRay(ray, 10, true, rapier.rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, rb);

        const isGrounded = hit && hit.timeOfImpact < height + 0.1;

        if (hit && hit.timeOfImpact < height) {
            const heightError = height - hit.timeOfImpact;
            const targetUpwardVel = heightError * floatSpring;
            velocityRef.current.y = velocityRef.current.y * (1 - floatDamping) + targetUpwardVel * floatDamping;
            rb.setGravityScale(0, true);
            dirtyRef.current = true;

            if (jump && isGrounded) {
                velocityRef.current.y = jumpVelocity;
                rb.setGravityScale(1, true);
            }
        } else {
            rb.setGravityScale(1, true);
        }

        const rot = rb.rotation();
        tempQuat.set(rot.x, rot.y, rot.z, rot.w);
        tempForward.set(0, 0, -1).applyQuaternion(tempQuat).setY(0).normalize();
        tempRight.set(1, 0, 0).applyQuaternion(tempQuat).setY(0).normalize();

        tempDirection.set(0, 0, 0)
            .addScaledVector(tempForward, vertical)
            .addScaledVector(tempRight, horizontal);

        const inputMagnitude = tempDirection.length();
        if (inputMagnitude > 0) {
            tempDirection.multiplyScalar(currentSpeed / inputMagnitude);
            velocityRef.current.x = tempDirection.x;
            velocityRef.current.z = tempDirection.z;
            dirtyRef.current = true;
        } else if (isGrounded) {
            velocityRef.current.x = 0;
            velocityRef.current.z = 0;
            dirtyRef.current = true;
        }

        // Add ground velocity if standing on a moving object
        if (hit && isGrounded) {
            const groundCollider = hit.collider;
            const groundRigidBody = groundCollider.parent();
            if (groundRigidBody && !groundRigidBody.isFixed()) {
                const groundLinvel = groundRigidBody.linvel();
                const speed = Math.sqrt(groundLinvel.x ** 2 + groundLinvel.y ** 2 + groundLinvel.z ** 2);
                if (speed > 0.01) {
                    velocityRef.current.x += groundLinvel.x;
                    velocityRef.current.z += groundLinvel.z;
                    dirtyRef.current = true;
                }
            }
        }

        if (dirtyRef.current) {
            rb.setLinvel(velocityRef.current, true);
        }
    });

    return null;
};

export const LookSystem = ({
    rigidBodyRef,
    cameraRigRef,
    cameraPitch
}: {
    rigidBodyRef: RefObject<RapierRigidBody | null>;
    cameraRigRef: RefObject<Group | null>;
    cameraPitch: RefObject<number>;
}) => {
    const lookHorizontal = useInputStore(state => state.lookHorizontal);
    const lookVertical = useInputStore(state => state.lookVertical);

    useFrame((_, delta) => {
        const rb = rigidBodyRef.current;
        const rig = cameraRigRef.current;
        if (!rb || !rig) return;

        const absHorizontal = Math.abs(lookHorizontal);
        const absVertical = Math.abs(lookVertical);

        if (absHorizontal > 0.01) {
            const yawDelta = -lookHorizontal * JOYSTICK_SENSITIVITY * delta;
            const rot = rb.rotation();
            tempQuat.set(rot.x, rot.y, rot.z, rot.w);
            tempYawQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, yawDelta);
            tempQuat.premultiply(tempYawQuat);
            rb.setRotation(tempQuat, true);
        }

        if (absVertical > 0.01) {
            cameraPitch.current = MathUtils.clamp(
                cameraPitch.current + lookVertical * JOYSTICK_SENSITIVITY * delta,
                -PITCH_LIMIT,
                PITCH_LIMIT
            );
            rig.rotation.x = cameraPitch.current;
        }
    });

    return null;
};
