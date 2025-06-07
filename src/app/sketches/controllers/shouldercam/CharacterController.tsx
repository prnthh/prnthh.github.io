/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import { Box, useKeyboardControls } from "@react-three/drei";
import { Camera, useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import { useEffect, useRef, useState, MutableRefObject, useMemo, useCallback } from "react";
import { MathUtils, Vector3, Group, PerspectiveCamera, Euler, Quaternion } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import AnimatedModel from "@/shared/HumanoidModel";
import * as THREE from "three";
import { FollowCam } from "../../../../shared/FollowCam";
import { usePointerLockControls } from "./usePointerLockControls";


export const CharacterController = () => {
    const WALK_SPEED = 2, RUN_SPEED = 4, JUMP_FORCE = 2;

    const height = 1.37
    const roundHeight = 0.25

    const { rapier, world } = useRapier();
    const rb = useRef<RapierRigidBody | null>(null);
    const container = useRef<Group>(null);
    const character = useRef<Group>(null);

    const [, get] = useKeyboardControls();
    const [animation, setAnimation] = useState<"idle" | "walk" | "run" | "jump">("idle");
    const [jumping, setJumping] = useState(false); // Track jump state

    const velocityRef = useRef<Vector3>(new Vector3(0, 0, 0));

    // Use the custom hook for pointer lock and mouse controls
    const { rotationTarget, verticalRotation, shoulderCamMode, setShoulderCamMode } = usePointerLockControls();

    useFrame(() => {
        if (!rb.current) return;
        const keyInputs = get();
        let moveX = 0, moveZ = 0;
        if (keyInputs.forward) moveZ += 1;
        if (keyInputs.backward) moveZ -= 1;
        if (keyInputs.left) moveX += 1;
        if (keyInputs.right) moveX -= 1;
        const speed = keyInputs.run ? RUN_SPEED : WALK_SPEED;

        // Animation state
        setAnimation(jumping ? "jump" : (moveX || moveZ) ? (speed === RUN_SPEED ? "run" : "walk") : "idle");

        // Rotation
        if (container.current) container.current.rotation.y = rotationTarget.current;

        // Jump/grounded logic
        if (jumping && checkGrounded()) {
            setJumping(false);
        }
        if (keyInputs.jump && !jumping && checkGrounded()) {
            rb.current.wakeUp?.();
            rb.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
            setJumping(true);
        }

        // Movement
        if (moveX || moveZ) {
            const dir = new Vector3(moveX, 0, moveZ).normalize().applyAxisAngle(new Vector3(0, 1, 0), rotationTarget.current);
            velocityRef.current.set(dir.x * speed, rb.current.linvel().y, dir.z * speed);
            rb.current.setLinvel(velocityRef.current, true);
        } else {
            // Update velocityRef for y only, so idle doesn't accumulate drift
            velocityRef.current.set(0, rb.current.linvel().y, 0);
            rb.current.setLinvel(velocityRef.current, true);
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
            const maxToi = 5;
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

            console.log("Ground check ray origin:", rayOrigin, "hit:", hit);
            return !!hit && hit.timeOfImpact < 0.35 && Math.abs(rb.current.linvel().y) < 1.0;
        };
    }, [rb, rapier, world, height, roundHeight]);

    // Helper to convert world to local coordinates for the container group
    function worldToLocalArray(world: [number, number, number]): [number, number, number] {
        if (!container.current) return world;
        const v = new Vector3(...world);
        container.current.worldToLocal(v);
        return [v.x, v.y, v.z];
    }

    return (
        <>
            <RigidBody colliders={false} lockRotations ref={rb} position={[0, 4, 0]}>
                <group ref={container}>
                    <FollowCam height={height}
                        verticalRotation={verticalRotation}
                        cameraOffset={shoulderCamMode ? new Vector3(-0.5, 0.8, -0.3) : new Vector3(0, 0.5, -0.5)}
                        targetOffset={shoulderCamMode ? new Vector3(0, height / 3, 3) : new Vector3(0, height / 2, 1.5)}
                    />
                    <group ref={character}>
                        <AnimatedModel
                            model="rigga.glb"
                            animation={animation}
                            height={height}
                        />
                    </group>
                </group>
                <CapsuleCollider args={[(height - (roundHeight * 1.9)) / 2, roundHeight]} position={[0, (height / 2), 0]} />
            </RigidBody>
        </>
    );
};