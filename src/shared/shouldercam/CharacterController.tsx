/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { Box, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import { useEffect, useRef, useState, useMemo, useCallback, RefObject } from "react";
import { MathUtils, Vector3, Group } from "three";
import * as THREE from "three";
import { usePointerLockControls } from "./usePointerLockControls";
import { FollowCam } from "@/shared/FollowCam";
import TSLLine from "./TSLLine";
import { useWeapon } from "./useWeapon";
import AnimatedModel from "../ped/HumanoidModel";


export const CharacterController = ({ lookTarget, name = 'bob', mode = 'third-person', children, forwardRef }: {
    lookTarget?: RefObject<THREE.Object3D | null>
    name?: string,
    mode?: "simple" | "side-scroll" | "third-person",
    children?: React.ReactNode,
    forwardRef?: (refs: { rbref: RefObject<RapierRigidBody | null>, meshref: RefObject<Group | null> }) => void
}) => {
    // --- Constants & refs ---
    const lastFacingRef = useRef<number>(0);
    const savedFacingRef = useRef<number | null>(null);
    const WALK_SPEED = 1.2, RUN_SPEED = 3, JUMP_FORCE = 1;
    const height = 1.2, roundHeight = 0.25;
    const { rapier, world } = useRapier();
    const rb = useRef<RapierRigidBody | null>(null);
    const container = useRef<Group>(null);
    const character = useRef<Group>(null);
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
    const [, get] = useKeyboardControls();
    const [animation, setAnimation] = useState<"idle" | "walk" | "run" | "jump" | "walkLeft" | "lpunch" | "rpunch" | string[]>("idle");

    const shoulderCamModeRef = useRef(false);
    const { weaponHandler } = useWeapon();

    // --- Camera & controls ---
    const pointerLockControls = usePointerLockControls({
        enabled: mode == "third-person", onClick: () => shoulderCamModeRef.current && weaponHandler()
    });
    const rotationTarget = mode !== "simple" ? pointerLockControls.rotationTarget : undefined;
    const verticalRotation = mode !== "simple" ? pointerLockControls.verticalRotation : undefined;
    const shoulderCamMode = mode !== "simple" ? pointerLockControls.shoulderCamMode : undefined;
    const setShoulderCamMode = mode !== "simple" ? pointerLockControls.setShoulderCamMode : undefined;

    // Keep ref updated with latest value
    useEffect(() => {
        shoulderCamModeRef.current = !!shoulderCamMode;
    }, [shoulderCamMode]);

    // Initialize third-person rotation when switching modes
    useEffect(() => {
        if (mode !== "third-person" || !rotationTarget || !character.current || !container.current) return;
        // Save current facing so we can restore it when returning to side-scroll
        savedFacingRef.current = lastFacingRef.current;
        const composed = container.current.rotation.y + character.current.rotation.y;
        rotationTarget.current = composed;
        container.current.rotation.y = composed;
        character.current.rotation.y = 0;
        lastFacingRef.current = 0;
    }, [mode, rotationTarget]);

    // Restore facing when switching back to side-scroll from third-person
    useEffect(() => {
        if (mode !== "side-scroll" || !character.current || !container.current) return;
        const restored = savedFacingRef.current ?? lastFacingRef.current;
        character.current.rotation.y = restored;
        container.current.rotation.y = 0;
        if (rotationTarget && rotationTarget.current !== undefined) rotationTarget.current = container.current.rotation.y;
    }, [mode, rotationTarget]);

    // --- Forward refs ---
    useEffect(() => {
        if (typeof forwardRef === 'function') {
            forwardRef({ rbref: rb, meshref: container });
        }
    }, [forwardRef]);

    // --- Movement helpers ---
    const setVelocity = useCallback((x: number, y: number, z: number) => {
        if (!rb.current) return;
        velocityRef.current.set(x, y, z);
        rb.current.setLinvel(velocityRef.current, true);
    }, []);

    const handleSimpleMode = useCallback((keyInputs: any) => {
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
            setVelocity(
                localDir.x * (keyInputs.run ? RUN_SPEED : WALK_SPEED),
                rb.current?.linvel().y ?? 0,
                localDir.z * (keyInputs.run ? RUN_SPEED : WALK_SPEED)
            );
        } else {
            setVelocity(0, rb.current?.linvel().y ?? 0, 0);
        }
        if (container.current && rotationTarget?.current !== undefined) {
            rotationTarget.current = container.current.rotation.y;
        }
    }, [setVelocity, rotationTarget]);

    const handleThirdPersonMode = useCallback((keyInputs: any) => {
        if (!rotationTarget) return;
        if (container.current) container.current.rotation.y = rotationTarget.current;
        let moveX = 0, moveZ = 0;
        if (keyInputs.forward) moveZ += 1;
        if (keyInputs.backward) moveZ -= 1;
        if (keyInputs.left) moveX += 1;
        if (keyInputs.right) moveX -= 1;
        if (mode === "side-scroll") {
            moveX = -moveX;
            moveZ = -moveZ;
        }
        const speed = keyInputs.run ? RUN_SPEED : WALK_SPEED;
        if (moveX || moveZ) {
            const dir = new Vector3(moveX, 0, moveZ).normalize().applyAxisAngle(new Vector3(0, 1, 0), rotationTarget.current);
            setVelocity(dir.x * speed, rb.current?.linvel().y ?? 0, dir.z * speed);
        } else {
            setVelocity(0, rb.current?.linvel().y ?? 0, 0);
        }
    }, [setVelocity, rotationTarget, mode]);

    const handleSideScrollMode = useCallback((keyInputs: any, moveX: number, moveZ: number, speed: number) => {
        if (verticalRotation?.current !== undefined) verticalRotation.current = 0;
        if (container.current) container.current.rotation.y = 0;
        if (rb.current && (moveX || moveZ)) {
            const charRot = character.current?.rotation.y ?? lastFacingRef.current;
            const dir = new Vector3(Math.sin(charRot), 0, Math.cos(charRot)).normalize();
            setVelocity(dir.x * speed, rb.current.linvel().y, dir.z * speed);
        } else {
            handleThirdPersonMode(keyInputs);
        }
    }, [setVelocity, verticalRotation, handleThirdPersonMode]);

    // --- Animation helpers ---
    const updateAnimation = useCallback((keyInputs: any, moveX: number, moveZ: number, speed: number) => {
        let nextAnimation: typeof animation | string[] = "idle";
        let targetFacing = lastFacingRef.current;
        if (keyInputs.use) {
            nextAnimation = "rpunch";
        } else if (keyInputs.altUse) {
            nextAnimation = "lpunch";
        } else if (jumping.current) {
            nextAnimation = "jump";
        } else if ((moveX || moveZ)) {
            if (mode === "third-person") {
                if (moveX && !moveZ) {
                    nextAnimation = "walkLeft";
                    if (walkLeftActionRef.current) walkLeftActionRef.current.timeScale = moveX;
                } else {
                    nextAnimation = (speed === RUN_SPEED ? "run" : "walk");
                    if (walkActionRef.current) walkActionRef.current.timeScale = moveZ;
                    if (runActionRef.current) runActionRef.current.timeScale = moveZ;
                }
            } else if (mode === "simple" || mode === "side-scroll") {
                if (moveX !== 0 || moveZ !== 0) {
                    targetFacing = Math.atan2(moveX, moveZ);
                }
                lastFacingRef.current = targetFacing;
                nextAnimation = (speed === RUN_SPEED ? "run" : "walk");
                if (walkActionRef.current) walkActionRef.current.timeScale = 1;
                if (runActionRef.current) runActionRef.current.timeScale = 1;
            }
        }
        // Smoothly rotate character to targetFacing in simple/side-scroll
        if ((mode === "simple" || mode === "side-scroll") && character.current) {
            let facing = targetFacing;
            if (mode === "side-scroll") facing += Math.PI;
            const currentY = character.current.rotation.y;
            let delta = facing - currentY;
            if (delta > Math.PI) delta -= Math.PI * 2;
            if (delta < -Math.PI) delta += Math.PI * 2;
            character.current.rotation.y += delta * 0.2;
        }
        setAnimation(nextAnimation);
    }, [mode, animation]);

    // --- Main frame loop ---
    useFrame(() => {
        if (!rb.current) return;
        const keyInputs = get();
        let moveX = 0, moveZ = 0;
        if (keyInputs.forward) moveZ += 1;
        if (keyInputs.backward) moveZ -= 1;
        if (keyInputs.left) moveX += 1;
        if (keyInputs.right) moveX -= 1;
        const speed = keyInputs.run ? RUN_SPEED : WALK_SPEED;

        updateAnimation(keyInputs, moveX, moveZ, speed);

        if (keyInputs.use || keyInputs.altUse) {
            setVelocity(0, rb.current.linvel().y, 0);
        } else {
            if (mode === "simple") {
                handleSimpleMode(keyInputs);
            } else if (mode === "side-scroll") {
                handleSideScrollMode(keyInputs, moveX, moveZ, speed);
            } else {
                handleThirdPersonMode(keyInputs);
            }
        }

        // Jump/grounded logic
        handleJump(keyInputs.jump, checkGrounded());
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

            return !!hit && hit.timeOfImpact < 0.1 && Math.abs(rb.current.linvel().y) < 0.1;
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
                            mode === "side-scroll"
                                ? new Vector3(0, 1, 2) // Camera in front, lower
                                : (shoulderCamMode
                                    ? new Vector3(-0.5, 0.5, -0.5)
                                    : new Vector3(0, 0.5, -1.5))
                        }
                        targetOffset={
                            mode === "side-scroll"
                                ? new Vector3(0, 1, 0) // Target at character center
                                : (shoulderCamMode
                                    ? new Vector3(0, 0.5, 1.5)
                                    : new Vector3(0, 0.5, 1.5))
                        }
                    />
                    <group ref={character}>
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
        </>
    );
};
