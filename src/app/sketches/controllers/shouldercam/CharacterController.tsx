/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import { Box, useKeyboardControls } from "@react-three/drei";
import { Camera, useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import { useEffect, useRef, useState, MutableRefObject, useMemo, useCallback, RefObject } from "react";
import { MathUtils, Vector3, Group, PerspectiveCamera, Euler, Quaternion } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import AnimatedModel from "@/shared/HumanoidModel";
import * as THREE from "three";
import { FollowCam } from "../../../../shared/FollowCam";
import { usePointerLockControls } from "./usePointerLockControls";


export const CharacterController = ({ lookTarget, name = 'bob', mode = 'third-person', forwardRef }: {
    lookTarget?: RefObject<THREE.Object3D | null>
    name?: string,
    mode?: "third-person" | "first-person" | "simple" | "side-scroll",
    forwardRef?: (refs: { rbref: MutableRefObject<RapierRigidBody | null>, meshref: MutableRefObject<Group | null> }) => void
}) => {
    const WALK_SPEED = 2, RUN_SPEED = 4, JUMP_FORCE = 0.8;

    const height = 1.2
    const roundHeight = 0.25

    const { rapier, world } = useRapier();
    const rb = useRef<RapierRigidBody | null>(null);
    const container = useRef<Group>(null);
    const character = useRef<Group>(null);

    // Forward refs on mount/update
    useEffect(() => {
        if (typeof forwardRef === 'function') {
            forwardRef({ rbref: rb, meshref: container });
        }
    }, [forwardRef]);

    const [, get] = useKeyboardControls();
    const [animation, setAnimation] = useState<"idle" | "walk" | "run" | "jump" | "walkLeft" | "lpunch" | "rpunch" | string[]>("idle");
    const jumping = useRef(false);

    const velocityRef = useRef<Vector3>(new Vector3(0, 0, 0));
    const walkActionRef = useRef<THREE.AnimationAction | null>(null);
    const walkLeftActionRef = useRef<THREE.AnimationAction | null>(null);
    const runActionRef = useRef<THREE.AnimationAction | null>(null);

    // Always call the hook to comply with React rules
    const pointerLockControls = usePointerLockControls();
    const rotationTarget = mode !== "simple" ? pointerLockControls.rotationTarget : undefined;
    const verticalRotation = mode !== "simple" ? pointerLockControls.verticalRotation : undefined;
    const shoulderCamMode = mode !== "simple" ? pointerLockControls.shoulderCamMode : undefined;
    const setShoulderCamMode = mode !== "simple" ? pointerLockControls.setShoulderCamMode : undefined;

    // --- Mode handlers ---
    function handleSimpleMode(keyInputs: any) {
        if (container.current) {
            const ROT_SPEED = 0.04;
            if (keyInputs.left) container.current.rotation.y += ROT_SPEED;
            if (keyInputs.right) container.current.rotation.y -= ROT_SPEED;
        }
        const localDir = new Vector3(0, 0, 0);
        if (keyInputs.forward) localDir.z += 1;
        if (keyInputs.backward) localDir.z -= 1;
        if (localDir.lengthSq() > 0) {
            localDir.normalize();
            if (container.current) localDir.applyAxisAngle(new Vector3(0, 1, 0), container.current.rotation.y);
            if (rb.current) {
                velocityRef.current.set(localDir.x * (keyInputs.run ? RUN_SPEED : WALK_SPEED), rb.current.linvel().y, localDir.z * (keyInputs.run ? RUN_SPEED : WALK_SPEED));
                rb.current.setLinvel(velocityRef.current, true);
            }
        } else {
            if (rb.current) {
                velocityRef.current.set(0, rb.current.linvel().y, 0);
                rb.current.setLinvel(velocityRef.current, true);
            }
        }
        if (container.current && rotationTarget?.current !== undefined) {
            rotationTarget.current = container.current.rotation.y;
        }
    }

    function handleThirdPersonMode(keyInputs: any) {
        if (!rotationTarget) return;
        if (container.current && rotationTarget) container.current.rotation.y = rotationTarget.current;
        let moveX = 0, moveZ = 0;
        if (keyInputs.forward) moveZ += 1;
        if (keyInputs.backward) moveZ -= 1;
        if (keyInputs.left) moveX += 1;
        if (keyInputs.right) moveX -= 1;

        // Invert directions for side-scroll mode
        if (mode === "side-scroll") {
            moveX = -moveX;
            moveZ = -moveZ;
        }

        const speed = keyInputs.run ? RUN_SPEED : WALK_SPEED;
        if (moveX || moveZ) {
            const dir = new Vector3(moveX, 0, moveZ).normalize().applyAxisAngle(new Vector3(0, 1, 0), rotationTarget.current);
            if (rb.current) {
                velocityRef.current.set(dir.x * speed, rb.current.linvel().y, dir.z * speed);
                rb.current.setLinvel(velocityRef.current, true);
            }
        } else {
            if (rb.current) {
                velocityRef.current.set(0, rb.current.linvel().y, 0);
                rb.current.setLinvel(velocityRef.current, true);
            }
        }
    }

    useFrame(() => {
        if (!rb.current) return;
        const keyInputs = get();
        let moveX = 0, moveZ = 0;
        if (keyInputs.forward) moveZ += 1;
        if (keyInputs.backward) moveZ -= 1;
        if (keyInputs.left) moveX += 1;
        if (keyInputs.right) moveX -= 1;
        const speed = keyInputs.run ? RUN_SPEED : WALK_SPEED;

        // Animation state and walkLeft logic
        let nextAnimation: typeof animation | string[] = "idle";
        if (keyInputs.use) {
            nextAnimation = "rpunch";
        } else if (keyInputs.altUse) {
            nextAnimation = "lpunch";
        } else if (jumping.current) {
            nextAnimation = "jump";
        } else if ((moveX || moveZ)) {
            if (mode === "simple" && (moveX && !moveZ)) {
                nextAnimation = "idle"; // No strafe anim in simple mode
            } else if (moveX && !moveZ) {
                if (mode === "side-scroll") {
                    nextAnimation = "walkLeft";
                    if (walkLeftActionRef.current)
                        walkLeftActionRef.current.timeScale = -moveX; // Reverse for right movement
                } else {
                    nextAnimation = "walkLeft";
                    if (walkLeftActionRef.current)
                        walkLeftActionRef.current.timeScale = moveX;
                }
            } else {
                nextAnimation = (speed === RUN_SPEED ? "run" : "walk");
                if (walkActionRef.current)
                    walkActionRef.current.timeScale = moveZ;
                if (runActionRef.current)
                    runActionRef.current.timeScale = moveZ
            }
        }
        setAnimation(nextAnimation);

        if (keyInputs.use || keyInputs.altUse) {
            if (rb.current) {
                velocityRef.current.set(0, rb.current.linvel().y, 0);
                rb.current.setLinvel(velocityRef.current, true);
            }
        } else {
            // --- Mode-specific logic ---
            if (mode === "simple") {
                handleSimpleMode(keyInputs);
            } else if (mode === "side-scroll") {
                // Camera lock: set rotationTarget and verticalRotation to zero if available
                if (container.current) container.current.rotation.y = 0;
                if (rotationTarget?.current !== undefined) rotationTarget.current = 0;
                if (verticalRotation?.current !== undefined) verticalRotation.current = 0;
                // Character movement is not restricted, use third person movement
                handleThirdPersonMode(keyInputs);
            } else {
                handleThirdPersonMode(keyInputs);
            }
        }

        // Jump/grounded logic (shared)
        if (jumping.current && checkGrounded()) {
            jumping.current = false;
        }
        if (keyInputs.jump && !jumping.current && checkGrounded()) {
            rb.current.wakeUp?.();
            rb.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
            jumping.current = true;
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

            return !!hit && hit.timeOfImpact < 0.02 && Math.abs(rb.current.linvel().y) < 0.1;
        };
    }, [rb, rapier, world, height, roundHeight]);

    return (
        <>
            <RigidBody colliders={false} lockRotations ref={rb} position={[0, 4, 0]} name={name} >
                <group ref={container}>
                    <FollowCam
                        height={1 / height}
                        verticalRotation={verticalRotation}
                        cameraOffset={
                            mode === "first-person"
                                ? new Vector3(0, 0, 0)
                                : mode === "side-scroll"
                                    ? new Vector3(0, 0.5, 2) // Camera in front, lower
                                    : (shoulderCamMode
                                        ? new Vector3(-0.5, 0.8, -0.3)
                                        : new Vector3(0, 0.2, -0.8))
                        }
                        targetOffset={
                            mode === "first-person"
                                ? new Vector3(0, 0, 0)
                                : mode === "side-scroll"
                                    ? new Vector3(0, 0.5, 0) // Target at character center
                                    : (shoulderCamMode
                                        ? new Vector3(0, 0.5, 1.5)
                                        : new Vector3(0, 0.5, 1.5))
                        }
                    />
                    <group ref={character}>
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
                        />
                    </group>
                </group>
                <CapsuleCollider args={[(height - (roundHeight * 1.9)) / 2, roundHeight]} position={[0, (height / 2), 0]} />
            </RigidBody>
        </>
    );
};