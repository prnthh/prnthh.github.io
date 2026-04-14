"use client";

import { FieldRenderer, useEntityRigidBodyRef, useEntityRuntime } from "react-three-game";
import type { Component, FieldDefinition } from "react-three-game";
import { useThree } from "@react-three/fiber";
import { useBeforePhysicsStep, useRapier } from "@react-three/rapier";
import { useCallback, useRef } from "react";
import { gameEvents } from "react-three-game";
import { MathUtils, Vector3 } from "three";
import KeyboardControls from "@/app/react-three-controller/controls/KeyboardControls";
import PointerLockControls from "@/app/react-three-controller/controls/PointerLockControls";
import useInputStore from "@/app/react-three-controller/controls/InputStore";

const DEFAULT_MAX_SPEED = 7;
const DEFAULT_GROUND_ACCEL = 60;
const DEFAULT_AIR_ACCEL = 10;
const DEFAULT_FRICTION = 10;
const DEFAULT_JUMP_SPEED = 6.5;
const DEFAULT_FOOTSTEP_EVENT = "player:footstep";
const DEFAULT_FOOTSTEP_MIN_INTERVAL = 0.28;
const DEFAULT_FOOTSTEP_MAX_INTERVAL = 0.48;
const DEFAULT_FOOTSTEP_MIN_SPEED = 1.5;
const GROUND_EPSILON = 0.05;
const MIN_GROUND_NORMAL_Y = 0.5;
const MAX_GROUNDED_RISING_SPEED = 0.5;
const MOUSE_SENSITIVITY = 0.002;
const LOOK_SENSITIVITY = 2.5;
const PITCH_MIN = -1.2;
const PITCH_MAX = 1.2;

type MovementState = {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
};

const bodyPosition = new Vector3();
const forwardVector = new Vector3();
const planarVelocity = new Vector3();
const rightVector = new Vector3();
const wishVector = new Vector3();
const worldUp = new Vector3(0, 1, 0);

type FirstPersonPlayerProperties = {
    maxSpeed?: number;
    groundAccel?: number;
    airAccel?: number;
    friction?: number;
    jumpSpeed?: number;
    groundProbeOffset?: number;
    footstepEventName?: string;
    footstepMinInterval?: number;
    footstepMaxInterval?: number;
    footstepMinSpeed?: number;
};

const firstPersonPlayerFields: FieldDefinition[] = [
    { name: "maxSpeed", type: "number", label: "Max Speed", min: 0.1, step: 0.1 },
    { name: "groundAccel", type: "number", label: "Ground Accel", min: 0.1, step: 0.1 },
    { name: "airAccel", type: "number", label: "Air Accel", min: 0.1, step: 0.1 },
    { name: "friction", type: "number", label: "Friction", min: 0, step: 0.1 },
    { name: "jumpSpeed", type: "number", label: "Jump Speed", min: 0, step: 0.1 },
    { name: "groundProbeOffset", type: "number", label: "Ground Probe Offset", min: 0.01, step: 0.01 },
    { name: "footstepEventName", type: "string", label: "Footstep Event", placeholder: DEFAULT_FOOTSTEP_EVENT },
    { name: "footstepMinInterval", type: "number", label: "Step Min Interval", min: 0.05, step: 0.01 },
    { name: "footstepMaxInterval", type: "number", label: "Step Max Interval", min: 0.05, step: 0.01 },
    { name: "footstepMinSpeed", type: "number", label: "Step Min Speed", min: 0, step: 0.1 },
];

function FirstPersonPlayerEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {
    return <FieldRenderer fields={firstPersonPlayerFields} values={component.properties} onChange={onUpdate} />;
}

function emitFootstep(eventName: string, speed: number) {
    gameEvents.emit(eventName, { speed });
}

function FirstPersonPlayerView({ properties, children }: { properties: FirstPersonPlayerProperties; children?: React.ReactNode }) {
    const { editMode } = useEntityRuntime();
    const rigidBodyRef = useEntityRigidBodyRef();
    const footstepTimerRef = useRef(0);
    const wasGroundedRef = useRef<boolean | null>(null);
    const cameraYaw = useRef(0);
    const cameraPitch = useRef(0);
    const jumpQueuedRef = useRef(false);
    const jumpPressedRef = useRef(false);
    const { camera } = useThree();
    const { rapier } = useRapier();
    const horizontal = useInputStore((state) => state.horizontal);
    const vertical = useInputStore((state) => state.vertical);
    const jump = useInputStore((state) => state.jump);
    const lookHorizontal = useInputStore((state) => state.lookHorizontal);
    const lookVertical = useInputStore((state) => state.lookVertical);

    const maxSpeed = properties.maxSpeed ?? DEFAULT_MAX_SPEED;
    const groundAccel = properties.groundAccel ?? DEFAULT_GROUND_ACCEL;
    const airAccel = properties.airAccel ?? DEFAULT_AIR_ACCEL;
    const friction = properties.friction ?? DEFAULT_FRICTION;
    const jumpSpeed = properties.jumpSpeed ?? DEFAULT_JUMP_SPEED;
    const groundProbeOffset = properties.groundProbeOffset ?? 0.88;
    const footstepEventName = properties.footstepEventName ?? DEFAULT_FOOTSTEP_EVENT;
    const footstepMinInterval = properties.footstepMinInterval ?? DEFAULT_FOOTSTEP_MIN_INTERVAL;
    const footstepMaxInterval = properties.footstepMaxInterval ?? DEFAULT_FOOTSTEP_MAX_INTERVAL;
    const footstepMinSpeed = properties.footstepMinSpeed ?? DEFAULT_FOOTSTEP_MIN_SPEED;

    const applyLookDelta = useCallback((dx: number, dy: number) => {
        cameraYaw.current -= dx * MOUSE_SENSITIVITY;
        cameraPitch.current = MathUtils.clamp(cameraPitch.current - dy * MOUSE_SENSITIVITY, PITCH_MIN, PITCH_MAX);
    }, []);

    useBeforePhysicsStep((world) => {
        const rigidBody = rigidBodyRef.current;
        if (!rigidBody) return;
        const delta = world.timestep;

        if (Math.abs(lookHorizontal) > 0.01) {
            cameraYaw.current -= lookHorizontal * LOOK_SENSITIVITY * delta;
        }
        if (Math.abs(lookVertical) > 0.01) {
            cameraPitch.current = MathUtils.clamp(cameraPitch.current + lookVertical * LOOK_SENSITIVITY * delta, PITCH_MIN, PITCH_MAX);
        }
        camera.rotation.order = "YXZ";
        camera.rotation.y = cameraYaw.current;
        camera.rotation.x = cameraPitch.current;

        if (jump && !jumpPressedRef.current) {
            jumpQueuedRef.current = true;
        }
        jumpPressedRef.current = jump;

        // Read camera facing for movement direction (read-only)
        camera.getWorldDirection(forwardVector);
        forwardVector.y = 0;

        if (forwardVector.lengthSq() < 1e-6) {
            forwardVector.set(0, 0, -1);
        } else {
            forwardVector.normalize();
        }

        rightVector.crossVectors(forwardVector, worldUp).normalize();

        wishVector
            .copy(forwardVector)
            .multiplyScalar(vertical)
            .addScaledVector(rightVector, horizontal);

        // Ground check via raycast from the rigid body position
        const translation = rigidBody.translation();
        bodyPosition.set(translation.x, translation.y, translation.z);

        const currentVelocity = rigidBody.linvel();
        const groundHit = world.castRayAndGetNormal(
            new rapier.Ray(bodyPosition, { x: 0, y: -1, z: 0 }),
            groundProbeOffset,
            true,
            undefined,
            undefined,
            undefined,
            rigidBody
        );
        const grounded =
            !!groundHit &&
            groundHit.timeOfImpact <= groundProbeOffset - GROUND_EPSILON &&
            groundHit.normal.y >= MIN_GROUND_NORMAL_Y &&
            currentVelocity.y <= MAX_GROUNDED_RISING_SPEED;
        const wasGrounded = wasGroundedRef.current;
        planarVelocity.set(currentVelocity.x, 0, currentVelocity.z);
        const speed = planarVelocity.length();

        if (wasGrounded === false && grounded) {
            emitFootstep(footstepEventName, speed);
        }

        if (grounded && speed > 0) {
            planarVelocity.multiplyScalar(Math.max(speed - speed * friction * delta, 0) / speed);
        }

        if (wishVector.lengthSq() > 0) {
            wishVector.normalize();
            const accel = grounded ? groundAccel : airAccel;
            const addSpeed = maxSpeed - planarVelocity.dot(wishVector);
            if (addSpeed > 0) {
                planarVelocity.addScaledVector(wishVector, Math.min(accel * delta * maxSpeed, addSpeed));
            }
        }

        if (grounded && jumpQueuedRef.current) {
            currentVelocity.y = jumpSpeed;
            jumpQueuedRef.current = false;
            emitFootstep(footstepEventName, planarVelocity.length());
        }

        const moveSpeed = planarVelocity.length();
        const moving = grounded && wishVector.lengthSq() > 0 && moveSpeed > footstepMinSpeed;

        if (!moving) {
            footstepTimerRef.current = 0;
        } else {
            footstepTimerRef.current -= delta;

            if (footstepTimerRef.current <= 0) {
                emitFootstep(footstepEventName, moveSpeed);

                const speedAlpha = Math.min(moveSpeed / maxSpeed, 1);
                footstepTimerRef.current = footstepMaxInterval - (footstepMaxInterval - footstepMinInterval) * speedAlpha;
            }
        }

        rigidBody.setLinvel({ x: planarVelocity.x, y: currentVelocity.y, z: planarVelocity.z }, true);
        wasGroundedRef.current = grounded;
    });

    if (editMode) {
        return (
            <group>
                {children}
            </group>
        );
    }

    return (
        <>
            <PointerLockControls onLook={applyLookDelta} />
            <KeyboardControls />
            {children}
        </>
    );
}

const FirstPersonPlayer: Component = {
    name: "FirstPersonPlayer",
    Editor: FirstPersonPlayerEditor,
    View: FirstPersonPlayerView,
    defaultProperties: {
        maxSpeed: DEFAULT_MAX_SPEED,
        groundAccel: DEFAULT_GROUND_ACCEL,
        airAccel: DEFAULT_AIR_ACCEL,
        friction: DEFAULT_FRICTION,
        jumpSpeed: DEFAULT_JUMP_SPEED,
        groundProbeOffset: 0.88,
        footstepEventName: DEFAULT_FOOTSTEP_EVENT,
        footstepMinInterval: DEFAULT_FOOTSTEP_MIN_INTERVAL,
        footstepMaxInterval: DEFAULT_FOOTSTEP_MAX_INTERVAL,
        footstepMinSpeed: DEFAULT_FOOTSTEP_MIN_SPEED,
    },
};

export default FirstPersonPlayer;
