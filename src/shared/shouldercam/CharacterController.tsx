/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import { useEffect, useRef, useState, useMemo, useCallback, RefObject } from "react";
import { MathUtils, Vector3, Group, Quaternion } from "three";
import * as THREE from "three";
import { FollowCam } from "@/shared/cameras/FollowCam";
import TSLLine from "./TSLLine";
import { useWeapon } from "./useWeapon";
import AnimatedModel from "../ped/HumanoidModel";
import { useInputStore } from "@/shared/providers/InputStore";
import { KeyboardInput } from "@/shared/firstperson/KeyboardInput";
import PointerLockControls from "@/shared/controls/PointerLockControls";

const tempQuat = new Quaternion();
const tempYawQuat = new Quaternion();
const tempForward = new Vector3();
const tempRight = new Vector3();
const tempDirection = new Vector3();

const MOUSE_SENSITIVITY = 0.002;
const JOYSTICK_SENSITIVITY = 2.5;
const PITCH_LIMIT = Math.PI / 2;


export const CharacterController = ({ position = [0, 2, 0], lookTarget, name = 'bob', children, forwardRef }: {
    position?: [number, number, number],
    lookTarget?: RefObject<THREE.Object3D | null>
    name?: string,
    children?: React.ReactNode,
    forwardRef?: (refs: { rbref: RefObject<RapierRigidBody | null>, meshref: RefObject<Group | null>, cameraRigRef: RefObject<Group | null> }) => void
}) => {
    // --- Constants & refs ---
    const WALK_SPEED = 1.2, RUN_SPEED = 3, JUMP_FORCE = 1;
    const height = 1.2, roundHeight = 0.25;
    const { rapier, world } = useRapier();
    const rb = useRef<RapierRigidBody | null>(null);
    const container = useRef<Group>(null);
    const character = useRef<Group>(null);
    const cameraRig = useRef<Group>(null);
    const velocityRef = useRef<Vector3>(new Vector3(0, 0, 0));
    const walkActionRef = useRef<THREE.AnimationAction | null>(null);
    const walkLeftActionRef = useRef<THREE.AnimationAction | null>(null);
    const runActionRef = useRef<THREE.AnimationAction | null>(null);

    // --- Jump state ---
    const jumping = useRef(false);
    const jumpReleased = useRef(true);

    // Clean jump logic
    const handleJump = useCallback((jumpPressed: boolean, grounded: boolean) => {
        if (!jumpPressed) jumpReleased.current = true;
        if (jumping.current && grounded) jumping.current = false;
        if (jumpPressed && jumpReleased.current && !jumping.current && grounded) {
            rb.current?.wakeUp?.();
            rb.current?.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
            jumping.current = true;
            jumpReleased.current = false;
        }
    }, [rb, JUMP_FORCE]);

    // Input state from store
    const horizontal = useInputStore(state => state.horizontal);
    const vertical = useInputStore(state => state.vertical);
    const sprint = useInputStore(state => state.sprint);
    const jump = useInputStore(state => state.jump);
    const use = useInputStore(state => state.use);
    const altUse = useInputStore(state => state.altUse);
    const verticalRotation = useRef(0);

    const [animation, setAnimation] = useState<"idle" | "walk" | "run" | "jump" | "walkLeft" | "lpunch" | "rpunch" | string[]>("idle");

    const shoulderCamModeRef = useRef(false);
    const { weaponHandler } = useWeapon();
    const [shoulderCamMode, setShoulderCamMode] = useState(false);

    // Keep ref updated with latest value
    useEffect(() => {
        shoulderCamModeRef.current = !!shoulderCamMode;
    }, [shoulderCamMode]);

    // Shared look logic - processes movement deltas directly
    const applyLookDelta = useCallback((dx: number, dy: number) => {
        if (!rb.current) return;

        const yawDelta = -dx * MOUSE_SENSITIVITY;
        const rot = rb.current.rotation();
        tempQuat.set(rot.x, rot.y, rot.z, rot.w);
        tempYawQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, yawDelta);
        tempQuat.premultiply(tempYawQuat);
        rb.current.setRotation(tempQuat, true);

        verticalRotation.current = THREE.MathUtils.clamp(
            verticalRotation.current + dy * MOUSE_SENSITIVITY,
            -PITCH_LIMIT,
            PITCH_LIMIT
        );
    }, []);

    // --- Forward refs ---
    useEffect(() => {
        if (typeof forwardRef === 'function') {
            // Create a fake cameraRig that exposes the vertical rotation
            const fakeCameraRig: any = {
                current: {
                    rotation: {
                        get x() { return verticalRotation.current; }
                    }
                }
            };
            forwardRef({ rbref: rb, meshref: container, cameraRigRef: fakeCameraRig });
        }
    }, [forwardRef]);

    // --- Movement helpers ---
    const setVelocity = useCallback((x: number, y: number, z: number) => {
        if (!rb.current) return;
        velocityRef.current.set(x, y, z);
        rb.current.setLinvel(velocityRef.current, true);
    }, []);

    const handleMovement = useCallback((moveX: number, moveZ: number, isRunning: boolean) => {
        if (!rb.current) return;

        const speed = isRunning ? RUN_SPEED : WALK_SPEED;

        if (moveX || moveZ) {
            // Get the current rotation of the rigid body
            const rot = rb.current.rotation();
            tempQuat.set(rot.x, rot.y, rot.z, rot.w);

            // Calculate forward and right directions based on capsule rotation
            tempForward.set(0, 0, -1).applyQuaternion(tempQuat).setY(0).normalize();
            tempRight.set(1, 0, 0).applyQuaternion(tempQuat).setY(0).normalize();

            // Combine forward and strafe movement
            tempDirection.set(0, 0, 0)
                .addScaledVector(tempForward, moveZ)
                .addScaledVector(tempRight, moveX);

            const inputMagnitude = tempDirection.length();
            if (inputMagnitude > 0) {
                tempDirection.multiplyScalar(speed / inputMagnitude);
            }

            setVelocity(tempDirection.x, rb.current.linvel().y, tempDirection.z);
        } else {
            setVelocity(0, rb.current.linvel().y, 0);
        }
    }, [setVelocity, RUN_SPEED, WALK_SPEED]);

    // --- Animation helpers ---
    const updateAnimation = useCallback((isUse: boolean, isAltUse: boolean, moveX: number, moveZ: number, speed: number) => {
        let nextAnimation: typeof animation | string[] = "idle";

        if (isUse) {
            nextAnimation = "rpunch";
        } else if (isAltUse) {
            nextAnimation = "lpunch";
        } else if (jumping.current) {
            nextAnimation = "jump";
        } else if ((moveX || moveZ)) {
            // Check if horizontal movement is dominant (for strafe animation)
            const absX = Math.abs(moveX);
            const absZ = Math.abs(moveZ);

            if (absX > 0.3 && absX > absZ * 1.5) {
                // Strafe left/right is dominant
                nextAnimation = "walkLeft";
                if (walkLeftActionRef.current) walkLeftActionRef.current.timeScale = -moveX;
            } else {
                nextAnimation = (speed === RUN_SPEED ? "run" : "walk");
                if (walkActionRef.current) walkActionRef.current.timeScale = moveZ;
                if (runActionRef.current) runActionRef.current.timeScale = moveZ;
            }
        }

        setAnimation(nextAnimation);
    }, [animation, RUN_SPEED]);

    // --- Main frame loop ---
    useFrame((_, delta) => {
        if (!rb.current) return;

        // Get input values from store
        const moveX = horizontal;
        const moveZ = vertical;
        const speed = sprint ? RUN_SPEED : WALK_SPEED;

        updateAnimation(use, altUse, moveX, moveZ, speed);

        if (use || altUse) {
            setVelocity(0, rb.current.linvel().y, 0);
        } else {
            handleMovement(moveX, moveZ, sprint);
        }

        // Jump/grounded logic
        handleJump(jump, checkGrounded());

        // Joystick look system - only processes joystick input from store
        const lookHorizontal = useInputStore.getState().lookHorizontal;
        const lookVertical = useInputStore.getState().lookVertical;

        const absHorizontal = Math.abs(lookHorizontal);
        const absVertical = Math.abs(lookVertical);

        if (absHorizontal > 0.01) {
            const yawDelta = -lookHorizontal * JOYSTICK_SENSITIVITY * delta;
            const rot = rb.current.rotation();
            tempQuat.set(rot.x, rot.y, rot.z, rot.w);
            tempYawQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, yawDelta);
            tempQuat.premultiply(tempYawQuat);
            rb.current.setRotation(tempQuat, true);
        }

        if (absVertical > 0.01) {
            verticalRotation.current = THREE.MathUtils.clamp(
                verticalRotation.current - lookVertical * JOYSTICK_SENSITIVITY * delta,
                -PITCH_LIMIT,
                PITCH_LIMIT
            );
        }
    });

    const checkGrounded = useMemo(() => {
        return () => {
            if (!rb.current || !rapier) return false;
            const origin = rb.current.translation();
            // Set the ray origin just above the bottom hemisphere of the capsule, moved 0.02 lower
            const rayOrigin = {
                x: origin.x,
                y: origin.y,
                z: origin.z
            };
            const direction = { x: 0, y: -1, z: 0 };
            const ray = new rapier.Ray(rayOrigin, direction);
            const maxToi = 0.1;
            const solid = true;

            // Get the player's collider to exclude it from the ray cast
            const playerCollider = rb.current.collider(0);

            const hit = world.castRay(
                ray,
                maxToi,
                solid,
                undefined, // filterFlags
                undefined, // filterGroups
                playerCollider // filterExcludeCollider - exclude the player's collider
            );

            const isGrounded = !!hit && hit.timeOfImpact < 0.1 && Math.abs(rb.current.linvel().y) < 0.1;

            // Add ground velocity if standing on a moving object
            if (hit && isGrounded) {
                const groundCollider = hit.collider;
                const groundRigidBody = groundCollider.parent();
                if (groundRigidBody && !groundRigidBody.isFixed()) {
                    const groundLinvel = groundRigidBody.linvel();
                    const speed = Math.sqrt(groundLinvel.x ** 2 + groundLinvel.y ** 2 + groundLinvel.z ** 2);
                    if (speed > 0.01) {
                        const currentVel = rb.current.linvel();
                        rb.current.setLinvel({
                            x: currentVel.x + groundLinvel.x,
                            y: currentVel.y,
                            z: currentVel.z + groundLinvel.z
                        }, true);
                    }
                }
            }

            return isGrounded;
        };
    }, [rb, rapier, world, height, roundHeight]);

    return (
        <>
            <RigidBody
                colliders={false}
                enabledRotations={[false, false, false]}
                ref={rb}
                position={position}
                name={name}
                angularDamping={1}
            >
                <group ref={container}>
                    <FollowCam
                        height={1 / height}
                        verticalRotation={verticalRotation}
                        cameraOffset={
                            shoulderCamMode
                                ? [-0.5, 0.5, 0.5]
                                : [0, 0.5, 1.5]
                        }
                        targetOffset={
                            shoulderCamMode
                                ? [0, 0.5, -1.5]
                                : [0, 0.5, -1.5]
                        }
                    />
                    <group ref={character} rotation={[0, Math.PI, 0]}>
                        {/* {shoulderCamMode && <TSLLine container={character} />} */}
                        <AnimatedModel
                            name={name}
                            basePath={"/models/human/onimilio/"}
                            model={"rigged.glb"}
                            animationOverrides={{
                                walk: 'anim/walk.fbx',
                                run: 'anim/run.fbx',
                                jump: 'anim/jump.fbx',
                                walkLeft: "/anim/walkLeft.fbx",
                                lpunch: "/anim/lpunch.fbx",
                                rpunch: "/anim/rpunch.fbx",
                            }}
                            animation={animation}
                            height={1.5}
                            lookTarget={lookTarget}
                            onActions={actions => {
                                walkActionRef.current = actions["walk"] || null;
                                walkLeftActionRef.current = actions["walkLeft"] || null;
                                runActionRef.current = actions["run"] || null;
                            }}
                        >
                            {children}
                        </AnimatedModel>
                    </group>
                </group>
                <CapsuleCollider args={[(height - (roundHeight * 1.9)) / 2, roundHeight]} position={[0, (height / 2), 0]} />
            </RigidBody>
            <PointerLockControls
                onLook={applyLookDelta}
                onClick={() => shoulderCamModeRef.current && weaponHandler()}
                onShoulderCamModeChange={setShoulderCamMode}
            />
            <KeyboardInput />
        </>
    );
};
