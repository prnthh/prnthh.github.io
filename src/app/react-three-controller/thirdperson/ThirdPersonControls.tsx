/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useEffect, useRef, useState, useCallback, RefObject } from "react";
import { Vector3, Object3D, MathUtils } from "three";

import { SceneCamera } from "@/shared/cameras/SceneCamera";

import { Weapon } from "../Weapon";
import useInputStore from "../controls/InputStore";
import KeyboardControls from "../controls/KeyboardControls";
import PointerLockControls from "../controls/PointerLockControls";
import { RigidHumanoidModelRef } from "../ped/types";

// Reusable temp vectors (allocated once)
const _fwd = new Vector3();
const _right = new Vector3();
const _dir = new Vector3();
const _pivot = new Vector3();

const MOUSE_SENSITIVITY = 0.002;
const JOYSTICK_SENSITIVITY = 2.5;
const PITCH_MIN = -0.4;
const PITCH_MAX = 1.2;
const TURN_SPEED = 10; // radians/sec for visual model rotation

interface ThirdPersonControlsProps {
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    height: number;
    capsuleRadius: number;
    walkSpeed?: number;
    runSpeed?: number;
    jumpForce?: number;
    orbitDistance?: number;
    lookTarget?: RefObject<Object3D | null>;
}

const ThirdPersonControls = ({
    modelRef,
    height,
    capsuleRadius,
    walkSpeed = 1.2,
    runSpeed = 3,
    jumpForce = 1,
    orbitDistance = 4,
    lookTarget,
}: ThirdPersonControlsProps) => {
    const cameraYaw = useRef(0);
    const cameraPitch = useRef(0.3);
    const sceneCameraRef = useRef<any>(null);

    const [animation, setAnimation] = useState<string>("idle");
    const [shoulderCamMode, setShoulder] = useState(false);
    const tap = useInputStore(state => state.tap);

    // ── Input selectors (subscribed reactively) ──
    const horizontal = useInputStore(s => s.horizontal);
    const vertical = useInputStore(s => s.vertical);
    const sprint = useInputStore(s => s.sprint);
    const jump = useInputStore(s => s.jump);
    const use = useInputStore(s => s.use);
    const altUse = useInputStore(s => s.altUse);
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

    // Push animation name to model
    useEffect(() => { modelRef.current?.setAnimation?.(animation); }, [animation, modelRef]);

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
        const cam = sceneCameraRef.current?.cameraRef?.current;
        if (!rb || !cam) return;

        // ─ Joystick orbit ─
        if (Math.abs(lookH) > 0.01) cameraYaw.current += lookH * JOYSTICK_SENSITIVITY * dt;
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
        else if (hasInput) anim = sprint ? "run" : "walk";
        setAnimation(anim);

        // Velocity
        const vy = rb.linvel().y;
        if (use || altUse) rb.setLinvel({ x: 0, y: vy, z: 0 }, true);
        else if (hasInput) rb.setLinvel({ x: _dir.x * speed, y: vy, z: _dir.z * speed }, true);
        else rb.setLinvel({ x: 0, y: vy, z: 0 }, true);

        // ─ Visual model rotation ─
        if (hasInput && !use && !altUse) {
            const targetYaw = Math.atan2(-horizontal, vertical) - yaw;
            const modelObj = modelRef.current?.modelRef?.current;
            if (modelObj) {
                let diff = targetYaw - modelObj.rotation.y;
                if (diff > Math.PI) diff -= Math.PI * 2;
                else if (diff < -Math.PI) diff += Math.PI * 2;
                modelObj.rotation.y += diff * Math.min(1, TURN_SPEED * dt);
            }
        }

        // ─ Camera (local space — parent is the RigidBody with lockRotations) ─
        const pos = rb.translation();
        const headY = height * 0.85;
        const pitch = cameraPitch.current;
        const dist = shoulderCamMode ? 2 : orbitDistance;
        const shoulder = shoulderCamMode ? 0.5 : 0;
        const cp = Math.cos(pitch);

        cam.position.set(
            dist * Math.sin(yaw) * cp - shoulder * Math.cos(yaw),
            headY + dist * Math.sin(pitch),
            -dist * Math.cos(yaw) * cp - shoulder * Math.sin(yaw),
        );
        // lookAt expects world-space; offset by the rigid body's world position
        _pivot.set(pos.x, pos.y + headY, pos.z);
        cam.lookAt(_pivot);
    });

    return (
        <>
            <SceneCamera ref={sceneCameraRef} fov={75} />
            <PointerLockControls
                onLook={applyLookDelta}
                onClick={() => { shoulderCamMode && tap(); }}
                onRightClickDown={() => setShoulder(true)}
                onRightClickUp={() => setShoulder(false)}
            />
            <KeyboardControls />
            {shoulderCamMode && <Weapon excludeRigidBody={modelRef.current?.rigidBodyRef} />}
        </>
    );
};

export default ThirdPersonControls;
