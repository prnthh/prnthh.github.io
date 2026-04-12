"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { useBeforePhysicsStep, useRapier } from "@react-three/rapier";
import { Component, gameEvents, useEntityRigidBodyRef, useEntityRuntime } from "react-three-game";
import { MathUtils, Vector3 } from "three";
import KeyboardControls from "@/app/react-three-controller/controls/KeyboardControls";
import useInputStore from "@/app/react-three-controller/controls/InputStore";

const DEFAULT_MAX_SPEED = 7;
const DEFAULT_GROUND_ACCEL = 60;
const DEFAULT_AIR_ACCEL = 10;
const DEFAULT_FRICTION = 10;
const DEFAULT_JUMP_SPEED = 6.5;
const DEFAULT_GROUND_PROBE_OFFSET = 0.88;
const DEFAULT_FOOTSTEP_EVENT = "player:footstep";
const DEFAULT_FOOTSTEP_MIN_INTERVAL = 0.28;
const DEFAULT_FOOTSTEP_MAX_INTERVAL = 0.48;
const DEFAULT_FOOTSTEP_MIN_SPEED = 1.5;
const DEFAULT_LOOK_SENSITIVITY = 0.002;
const DEFAULT_JOYSTICK_LOOK_SPEED = 2.5;
const GROUND_EPSILON = 0.05;
const MIN_INPUT_THRESHOLD = 0.001;

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
    lookSensitivity?: number;
    joystickLookSpeed?: number;
};

const bodyPosition = new Vector3();
const planarVelocity = new Vector3();
const forwardVector = new Vector3();
const rightVector = new Vector3();
const wishVector = new Vector3();
const worldUp = new Vector3(0, 1, 0);

function FirstPersonPlayerEditor() {
    return null;
}

function FirstPersonPlayerView({ properties, children }: { properties: FirstPersonPlayerProperties; children?: React.ReactNode }) {
    const { editMode } = useEntityRuntime();
    const rigidBodyRef = useEntityRigidBodyRef();
    const { rapier } = useRapier();
    const camera = useThree((state) => state.camera);
    const horizontal = useInputStore((state) => state.horizontal);
    const vertical = useInputStore((state) => state.vertical);
    const lookHorizontal = useInputStore((state) => state.lookHorizontal);
    const lookVertical = useInputStore((state) => state.lookVertical);
    const jump = useInputStore((state) => state.jump);

    const cameraPitch = useRef(0);
    const footstepTimerRef = useRef(0);
    const jumpReleasedRef = useRef(true);

    const maxSpeed = properties.maxSpeed ?? DEFAULT_MAX_SPEED;
    const groundAccel = properties.groundAccel ?? DEFAULT_GROUND_ACCEL;
    const airAccel = properties.airAccel ?? DEFAULT_AIR_ACCEL;
    const friction = properties.friction ?? DEFAULT_FRICTION;
    const jumpSpeed = properties.jumpSpeed ?? DEFAULT_JUMP_SPEED;
    const groundProbeOffset = properties.groundProbeOffset ?? DEFAULT_GROUND_PROBE_OFFSET;
    const footstepEventName = properties.footstepEventName ?? DEFAULT_FOOTSTEP_EVENT;
    const footstepMinInterval = properties.footstepMinInterval ?? DEFAULT_FOOTSTEP_MIN_INTERVAL;
    const footstepMaxInterval = properties.footstepMaxInterval ?? DEFAULT_FOOTSTEP_MAX_INTERVAL;
    const footstepMinSpeed = properties.footstepMinSpeed ?? DEFAULT_FOOTSTEP_MIN_SPEED;
    const lookSensitivity = properties.lookSensitivity ?? DEFAULT_LOOK_SENSITIVITY;
    const joystickLookSpeed = properties.joystickLookSpeed ?? DEFAULT_JOYSTICK_LOOK_SPEED;

    useFrame((_, delta) => {
        if (editMode) {
            return;
        }

        cameraPitch.current = camera.rotation.x;

        const hasLookInput = Math.abs(lookHorizontal) > MIN_INPUT_THRESHOLD || Math.abs(lookVertical) > MIN_INPUT_THRESHOLD;

        if (!hasLookInput) {
            return;
        }

        camera.rotation.y -= lookHorizontal * joystickLookSpeed * delta;
        cameraPitch.current = MathUtils.clamp(cameraPitch.current - lookVertical * joystickLookSpeed * delta, -Math.PI / 2, Math.PI / 2);
        camera.rotation.x = cameraPitch.current;
    });

    useBeforePhysicsStep((world) => {
        if (editMode) {
            return;
        }

        const rigidBody = rigidBodyRef.current;

        if (!rigidBody) {
            return;
        }

        const delta = world.timestep;
        const currentVelocity = rigidBody.linvel();
        const translation = rigidBody.translation();

        bodyPosition.set(translation.x, translation.y, translation.z);

        const groundHit = world.castRay(
            new rapier.Ray(bodyPosition, { x: 0, y: -1, z: 0 }),
            groundProbeOffset,
            true,
            undefined,
            undefined,
            undefined,
            rigidBody
        );
        const grounded = !!groundHit && groundHit.timeOfImpact <= groundProbeOffset - GROUND_EPSILON;

        camera.getWorldDirection(forwardVector);
        forwardVector.y = 0;

        if (forwardVector.lengthSq() < 1e-6) {
            forwardVector.set(0, 0, -1);
        } else {
            forwardVector.normalize();
        }

        rightVector.crossVectors(forwardVector, worldUp).normalize();

        wishVector
            .set(0, 0, 0)
            .addScaledVector(forwardVector, vertical)
            .addScaledVector(rightVector, horizontal);

        planarVelocity.set(currentVelocity.x, 0, currentVelocity.z);

        if (grounded) {
            const speed = planarVelocity.length();

            if (speed > 0) {
                planarVelocity.multiplyScalar(Math.max(speed - speed * friction * delta, 0) / speed);
            }
        }

        if (wishVector.lengthSq() > MIN_INPUT_THRESHOLD) {
            wishVector.normalize();
            const accel = grounded ? groundAccel : airAccel;
            const addSpeed = maxSpeed - planarVelocity.dot(wishVector);

            if (addSpeed > 0) {
                planarVelocity.addScaledVector(wishVector, Math.min(accel * delta * maxSpeed, addSpeed));
            }
        }

        let nextVerticalVelocity = currentVelocity.y;

        if (!jump) {
            jumpReleasedRef.current = true;
        }

        if (grounded && jump && jumpReleasedRef.current) {
            nextVerticalVelocity = jumpSpeed;
            jumpReleasedRef.current = false;
        }

        const speed = planarVelocity.length();
        const moving = grounded && wishVector.lengthSq() > MIN_INPUT_THRESHOLD && speed > footstepMinSpeed;

        if (!moving) {
            footstepTimerRef.current = 0;
        } else {
            footstepTimerRef.current -= delta;

            if (footstepTimerRef.current <= 0) {
                gameEvents.emit(footstepEventName, { speed });

                const speedAlpha = Math.min(speed / maxSpeed, 1);
                footstepTimerRef.current = footstepMaxInterval - (footstepMaxInterval - footstepMinInterval) * speedAlpha;
            }
        }

        rigidBody.setLinvel({ x: planarVelocity.x, y: nextVerticalVelocity, z: planarVelocity.z }, true);
    });

    if (editMode) {
        return <>{children}</>;
    }

    return (
        <>
            {children}
            <KeyboardControls />
            <PointerLockControls makeDefault pointerSpeed={lookSensitivity / DEFAULT_LOOK_SENSITIVITY} />
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
        groundProbeOffset: DEFAULT_GROUND_PROBE_OFFSET,
        footstepEventName: DEFAULT_FOOTSTEP_EVENT,
        footstepMinInterval: DEFAULT_FOOTSTEP_MIN_INTERVAL,
        footstepMaxInterval: DEFAULT_FOOTSTEP_MAX_INTERVAL,
        footstepMinSpeed: DEFAULT_FOOTSTEP_MIN_SPEED,
        lookSensitivity: DEFAULT_LOOK_SENSITIVITY,
        joystickLookSpeed: DEFAULT_JOYSTICK_LOOK_SPEED,
    },
};

export default FirstPersonPlayer;