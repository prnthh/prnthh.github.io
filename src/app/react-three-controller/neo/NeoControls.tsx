/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useRef, useCallback, RefObject, forwardRef, useImperativeHandle } from "react";
import { Vector3, MathUtils } from "three";

import useInputStore from "../controls/InputStore";
import KeyboardControls from "../controls/KeyboardControls";
import PointerLockControls from "../controls/PointerLockControls";
import { RigidHumanoidModelRef } from "../ped/types";

// Reusable temp vectors (allocated once)
const _fwd = new Vector3();
const _right = new Vector3();
const _dir = new Vector3();

const MOUSE_SENSITIVITY = 0.002;
const JOYSTICK_SENSITIVITY = 2.5;
const PITCH_MIN = -0.4;
const PITCH_MAX = 1.2;
const TURN_SPEED = 10; // radians/sec for visual model rotation
const MIN_CAMERA_DISTANCE = 0;
const MAX_CAMERA_DISTANCE = 4;
const STRAFE_THRESHOLD = 0.3;

export interface NeoCameraState {
    yaw: number;
    pitch: number;
    cameraDistance: number;
    cameraOffset: [number, number, number];
}

export interface NeoControlsRef {
    getCameraState: () => NeoCameraState;
}

interface NeoControlsProps {
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    cameraDistance?: number;
    onCameraDistanceChange?: (cameraDistance: number) => void;
    walkSpeed?: number;
    runSpeed?: number;
    jumpForce?: number;
}

const NeoControls = forwardRef<NeoControlsRef, NeoControlsProps>(({
    modelRef,
    cameraDistance = MAX_CAMERA_DISTANCE,
    onCameraDistanceChange,
    walkSpeed = 1.2,
    runSpeed = 3,
    jumpForce = 1,
}: NeoControlsProps, ref) => {
    const cameraYaw = useRef(0);
    const cameraPitch = useRef(0.3);
    const currentAnimation = useRef("idle");

    const tap = useInputStore(state => state.tap);

    // ── Input selectors (subscribed reactively) ──
    const horizontal = useInputStore(s => s.horizontal);
    const vertical = useInputStore(s => s.vertical);
    const sprint = useInputStore(s => s.sprint);
    const jump = useInputStore(s => s.jump);
    const use = useInputStore(s => s.use);
    const altUse = useInputStore(s => s.altUse);
    const aim = useInputStore(s => s.aim);
    const lookH = useInputStore(s => s.lookHorizontal);
    const lookV = useInputStore(s => s.lookVertical);

    const { rapier, world } = useRapier();
    const jumping = useRef(false);
    const jumpReleased = useRef(true);

    // Mouse look → camera orbit
    const applyLookDelta = useCallback((dx: number, dy: number) => {
        cameraYaw.current += dx * MOUSE_SENSITIVITY;
        cameraPitch.current = MathUtils.clamp(cameraPitch.current + dy * MOUSE_SENSITIVITY, PITCH_MIN, PITCH_MAX);
    }, []);

    const applyCameraDistanceDelta = useCallback((delta: number) => {
        onCameraDistanceChange?.(
            MathUtils.clamp(cameraDistance + delta, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE)
        );
    }, [cameraDistance, onCameraDistanceChange]);

    const setModelAnimation = useCallback((nextAnimation: string) => {
        if (currentAnimation.current === nextAnimation) return;
        currentAnimation.current = nextAnimation;
        modelRef.current?.setAnimation?.(nextAnimation);
    }, [modelRef]);

    useImperativeHandle(ref, () => ({
        getCameraState: () => ({
            yaw: cameraYaw.current,
            pitch: cameraPitch.current,
            cameraDistance,
            cameraOffset: [0, 0, -cameraDistance],
        }),
    }), [cameraDistance]);

    // Ground check
    const checkGrounded = useCallback(() => {
        const rb = modelRef.current?.rigidBodyRef.current;
        if (!rb || !rapier) return false;
        const origin = rb.translation();
        const hit = world.castRay(
            new rapier.Ray(origin, { x: 0, y: -1, z: 0 }),
            0.1, true, undefined, undefined, rb.collider(0),
        );
        return !!hit && hit.timeOfImpact < 0.1 && Math.abs(rb.linvel().y) < 0.5;
    }, [modelRef, rapier, world]);

    // ── Single useFrame: movement + model turn + joystick orbit + camera ──
    useFrame((_, dt) => {
        const rb = modelRef.current?.rigidBodyRef.current;
        if (!rb) return;
        const attacking = use || altUse;

        // ─ Joystick orbit ─
        if (Math.abs(lookH) > 0.01) {
            cameraYaw.current += lookH * JOYSTICK_SENSITIVITY * dt;
        }
        if (Math.abs(lookV) > 0.01) cameraPitch.current = MathUtils.clamp(cameraPitch.current - lookV * JOYSTICK_SENSITIVITY * dt, PITCH_MIN, PITCH_MAX);

        // ─ Movement ─
        const speed = sprint ? runSpeed : walkSpeed;
        const grounded = checkGrounded();

        if (!jump) jumpReleased.current = true;
        if (jumping.current && grounded) jumping.current = false;
        if (jump && jumpReleased.current && !jumping.current && grounded) {
            rb.wakeUp?.();
            rb.applyImpulse({ x: 0, y: jumpForce, z: 0 }, true);
            jumping.current = true;
            jumpReleased.current = false;
        }

        const yaw = cameraYaw.current;
        _fwd.set(-Math.sin(yaw), 0, Math.cos(yaw));
        _right.set(-Math.cos(yaw), 0, -Math.sin(yaw));
        _dir.set(0, 0, 0).addScaledVector(_fwd, vertical).addScaledVector(_right, horizontal);
        const hasInput = _dir.lengthSq() > 1e-4;
        if (hasInput) _dir.normalize();

        // Animation
        let anim = "idle";
        if (use) anim = "rpunch";
        else if (altUse) anim = "lpunch";
        else if (jumping.current) anim = "jump";
        else if (hasInput) {
            const absX = Math.abs(horizontal);
            const absZ = Math.abs(vertical);
            const isStrafing = aim && absX > STRAFE_THRESHOLD && absX > absZ * 1.5;
            const isBackpedaling = aim && vertical < 0;

            if (isStrafing) {
                anim = horizontal > 0 ? "walkRight" : "walkLeft";
            } else if (isBackpedaling) {
                anim = sprint ? "runBack" : "walkBack";
            } else {
                anim = sprint ? "run" : "walk";
            }
        }
        setModelAnimation(anim);

        // Velocity
        const vy = rb.linvel().y;
        if (attacking) rb.setLinvel({ x: 0, y: vy, z: 0 }, true);
        else if (hasInput) rb.setLinvel({ x: _dir.x * speed, y: vy, z: _dir.z * speed }, true);
        else rb.setLinvel({ x: 0, y: vy, z: 0 }, true);

        // ─ Visual model rotation ─
        if (hasInput && !attacking) {
            const modelObj = modelRef.current?.modelRef?.current;
            if (modelObj) {
                const targetYaw = aim ? -yaw : Math.atan2(-horizontal, vertical) - yaw;
                const diff = Math.atan2(
                    Math.sin(targetYaw - modelObj.rotation.y),
                    Math.cos(targetYaw - modelObj.rotation.y)
                );
                modelObj.rotation.y += diff * Math.min(1, TURN_SPEED * dt);
            }
        }
    });

    return (
        <>
            <PointerLockControls
                onLook={applyLookDelta}
                onZoom={applyCameraDistanceDelta}
                onClick={() => { cameraDistance <= MIN_CAMERA_DISTANCE && tap(); }}
            />
            <KeyboardControls />
        </>
    );
});

NeoControls.displayName = "NeoControls";

export default NeoControls;
