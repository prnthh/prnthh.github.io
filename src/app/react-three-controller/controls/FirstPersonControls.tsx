/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import { RapierRigidBody, useRapier } from "@react-three/rapier";
import { useRef, RefObject, useState, useEffect, useMemo, useCallback } from "react";
import { Vector3, Quaternion, MathUtils, Group } from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import PointerLockControls from "./PointerLockControls";
import useInputStore from "./InputStore";
import KeyboardControls from "./KeyboardControls";
import { RigidHumanoidModelRef } from "../ped/types";

const q = new Quaternion(), yq = new Quaternion(), fwd = new Vector3(), rt = new Vector3(), dir = new Vector3(), ray = new Vector3();

interface FirstPersonControlsProps {
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    height: number;
    eyeHeight: number;
    cameraOffset?: [number, number, number];
    walkSpeed?: number;
    sprintSpeed?: number;
    jumpVelocity?: number;
    floatSpring?: number;
    floatDamping?: number;
    cameraRigRef?: RefObject<Group | null>;
    setAnimation?: (anim: string) => void;
    children?: React.ReactNode;
}

const FirstPersonControls = ({
    modelRef,
    height,
    eyeHeight,
    cameraOffset = [0, 0, 0],
    walkSpeed = 3.5,
    sprintSpeed = 6.5,
    jumpVelocity = 4.5,
    floatSpring = 8,
    floatDamping = 0.3,
    cameraRigRef: providedCameraRigRef,
    setAnimation,
    children,
}: FirstPersonControlsProps) => {
    const internalCameraRigRef = useRef<Group | null>(null);
    const cameraRigRef = providedCameraRigRef || internalCameraRigRef;
    const cameraPitch = useRef(0);

    const applyLookDelta = useCallback((dx: number, dy: number) => {
        const rb = modelRef.current?.rigidBodyRef.current;
        if (!rb) return;
        rb.wakeUp?.();
        const rot = rb.rotation();
        q.set(rot.x, rot.y, rot.z, rot.w);
        yq.setFromAxisAngle({ x: 0, y: 1, z: 0 }, -dx * 0.002);
        rb.setRotation(q.premultiply(yq), true);
        cameraPitch.current = MathUtils.clamp(cameraPitch.current + dy * 0.002, -Math.PI / 2, Math.PI / 2);
        if (cameraRigRef.current) cameraRigRef.current.rotation.x = cameraPitch.current;
    }, [modelRef, cameraRigRef]);

    return (
        <>
            <group name='cameraRig' position={[0, eyeHeight, 0]} ref={cameraRigRef}>
                <group name='camera' position={cameraOffset} rotation={[0, Math.PI, 0]}>
                    <PerspectiveCamera makeDefault />
                    {children}
                </group>
            </group>
            <KeyboardControls />
            <MovementSystem
                height={height} modelRef={modelRef}
                walkSpeed={walkSpeed} sprintSpeed={sprintSpeed} jumpVelocity={jumpVelocity}
                floatSpring={floatSpring} floatDamping={floatDamping}
                setAnimation={setAnimation}
            />
            <LookSystem modelRef={modelRef} cameraRigRef={cameraRigRef} cameraPitch={cameraPitch} />
            <PointerLockControls onLook={applyLookDelta} />
        </>
    );
};

export default FirstPersonControls;

export const MovementSystem = ({
    height = 0.5,
    modelRef,
    walkSpeed = 3.5,
    sprintSpeed = 6.5,
    jumpVelocity = 4.5,
    floatSpring = 8,
    floatDamping = 0.3,
    setAnimation,
}: {
    height?: number;
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    walkSpeed?: number;
    sprintSpeed?: number;
    jumpVelocity?: number;
    floatSpring?: number;
    floatDamping?: number;
    setAnimation?: (anim: string) => void;
}) => {

    const horizontal = useInputStore(state => state.horizontal);
    const vertical = useInputStore(state => state.vertical);
    const sprint = useInputStore(state => state.sprint);
    const jump = useInputStore(state => state.jump);
    const use = useInputStore(state => state.use);
    const altUse = useInputStore(state => state.altUse);
    const rapier = useRapier();
    const jumping = useRef(false);
    const jumpReleased = useRef(true);

    useFrame((_, dt) => {
        const rb = modelRef.current?.rigidBodyRef.current;
        if (!rb) return;

        const pos = rb.translation(), vel = rb.linvel(), rot = rb.rotation();
        const spd = sprint ? sprintSpeed : walkSpeed;

        // Ground check
        ray.set(pos.x, pos.y, pos.z);
        const hit = rapier.world.castRay(new rapier.rapier.Ray(ray, { x: 0, y: -1, z: 0 }), height + 0.5, true,
            rapier.rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, rb);
        const grounded = hit && hit.timeOfImpact <= height + 0.1;

        // Input direction
        q.set(rot.x, rot.y, rot.z, rot.w);
        fwd.set(0, 0, 1).applyQuaternion(q).setY(0).normalize();
        rt.set(-1, 0, 0).applyQuaternion(q).setY(0).normalize();
        dir.set(0, 0, 0).addScaledVector(fwd, vertical).addScaledVector(rt, horizontal);

        const hasInput = dir.lengthSq() > 1e-4;
        if (hasInput) dir.normalize();

        // Handle jump
        if (!jump) jumpReleased.current = true;
        if (jumping.current && grounded) jumping.current = false;
        if (jump && jumpReleased.current && !jumping.current && grounded) {
            rb.wakeUp?.();
            jumping.current = true;
            jumpReleased.current = false;
        }

        // Update animation based on input
        let nextAnimation = "idle";

        if (use) {
            nextAnimation = "rpunch";
        } else if (altUse) {
            nextAnimation = "lpunch";
        } else if (jumping.current) {
            nextAnimation = "jump";
        } else if (hasInput) {
            const absX = Math.abs(horizontal);
            const absZ = Math.abs(vertical);

            if (absX > 0.3 && absX > absZ * 1.5) {
                // Strafing left/right
                nextAnimation = horizontal > 0 ? "walkRight" : "walkLeft";
            } else if (vertical < 0) {
                // Moving backwards
                nextAnimation = sprint ? "runBack" : "walkBack";
            } else {
                // Moving forwards
                nextAnimation = sprint ? "run" : "walk";
            }
        }

        setAnimation?.(nextAnimation);

        // Horizontal velocity
        let vx = vel.x, vz = vel.z;

        if (use || altUse) {
            // Stop movement during attacks
            vx = 0;
            vz = 0;
        } else if (grounded) {
            if (hasInput) {
                vx += (dir.x * spd - vx) * Math.min(1, 100 * dt);
                vz += (dir.z * spd - vz) * Math.min(1, 100 * dt);
            } else {
                vx = vz = 0;
            }
            // Moving platform
            const ground = hit.collider.parent();
            if (ground && !ground.isFixed()) {
                const gv = ground.linvel();
                vx += gv.x; vz += gv.z;
            }
        } else if (hasInput) {
            vx += (dir.x * spd - vx) * Math.min(1, 10 * dt);
            vz += (dir.z * spd - vz) * Math.min(1, 10 * dt);
        }

        // Clamp tiny velocities
        if (Math.abs(vx) < 0.01) vx = 0;
        if (Math.abs(vz) < 0.01) vz = 0;

        // Vertical velocity
        let vy = vel.y;
        if (grounded) {
            const distFromGround = hit.timeOfImpact - height;
            vy = vy * (1 - floatDamping) - distFromGround * floatSpring * floatDamping;
            if (Math.abs(vy) < 0.01) vy = 0;
            rb.setGravityScale(jump ? 1 : 0, true);
            if (jump && jumpReleased.current === false) vy = jumpVelocity;
        } else {
            rb.setGravityScale(1, true);
        }

        rb.setLinvel({ x: vx, y: vy, z: vz }, true);
    });

    return null;
};

export const LookSystem = ({
    modelRef,
    cameraRigRef,
    cameraPitch
}: {
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    cameraRigRef: RefObject<Group | null>;
    cameraPitch: RefObject<number>;
}) => {
    const lookHorizontal = useInputStore(state => state.lookHorizontal);
    const lookVertical = useInputStore(state => state.lookVertical);

    useFrame((_, dt) => {
        const rb = modelRef.current?.rigidBodyRef.current, rig = cameraRigRef.current;
        if (!rb || !rig) return;

        if (Math.abs(lookHorizontal) > 0.01) {
            const rot = rb.rotation();
            q.set(rot.x, rot.y, rot.z, rot.w);
            yq.setFromAxisAngle({ x: 0, y: 1, z: 0 }, -lookHorizontal * 2.5 * dt);
            rb.setRotation(q.premultiply(yq), true);
        }

        if (Math.abs(lookVertical) > 0.01) {
            cameraPitch.current = MathUtils.clamp(cameraPitch.current - lookVertical * 2.5 * dt, -Math.PI / 2, Math.PI / 2);
            rig.rotation.x = cameraPitch.current;
        }
    });

    return null;
};
