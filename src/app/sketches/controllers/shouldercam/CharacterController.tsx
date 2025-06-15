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


export const CharacterController = ({ lookTarget, name = 'bob' }: {
    lookTarget?: RefObject<THREE.Object3D | null>
    name?: string
}) => {
    const WALK_SPEED = 2, RUN_SPEED = 4, JUMP_FORCE = 0.8;

    const height = 1.2
    const roundHeight = 0.25

    const { rapier, world } = useRapier();
    const rb = useRef<RapierRigidBody | null>(null);
    const container = useRef<Group>(null);
    const character = useRef<Group>(null);

    const [, get] = useKeyboardControls();
    const [animation, setAnimation] = useState<"idle" | "walk" | "run" | "jump" | "walkLeft" | "lpunch" | "rpunch">("idle");
    const jumping = useRef(false);

    const velocityRef = useRef<Vector3>(new Vector3(0, 0, 0));
    const walkActionRef = useRef<THREE.AnimationAction | null>(null);
    const walkLeftActionRef = useRef<THREE.AnimationAction | null>(null);
    const runActionRef = useRef<THREE.AnimationAction | null>(null);

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

        // Animation state and walkLeft logic
        let nextAnimation: typeof animation = "idle";
        if (keyInputs.use) {
            nextAnimation = "rpunch";
        } else if (keyInputs.altUse) {
            nextAnimation = "lpunch";
        } else if (jumping.current) {
            nextAnimation = "jump";
        } else if ((moveX || moveZ)) {
            if (moveX && !moveZ) {
                nextAnimation = "walkLeft";
                if (walkLeftActionRef.current)
                    walkLeftActionRef.current.timeScale = moveX;
            } else {
                nextAnimation = (speed === RUN_SPEED ? "run" : "walk");
                if (walkActionRef.current)
                    walkActionRef.current.timeScale = moveZ;
                if (runActionRef.current)
                    runActionRef.current.timeScale = moveZ
            }
        }
        setAnimation(nextAnimation);


        // Rotation
        if (container.current) container.current.rotation.y = rotationTarget.current;

        // Jump/grounded logic
        if (jumping.current && checkGrounded()) {
            jumping.current = false;
        }
        if (keyInputs.jump && !jumping.current && checkGrounded()) {
            rb.current.wakeUp?.();
            rb.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
            jumping.current = true;
        }

        // Movement
        if (keyInputs.use || keyInputs.altUse) {
            // If using or altUsing, stop movement (keep y velocity)
            velocityRef.current.set(0, rb.current.linvel().y, 0);
            rb.current.setLinvel(velocityRef.current, true);
        } else if (moveX || moveZ) {
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

    // Helper to convert world to local coordinates for the container group
    function worldToLocalArray(world: [number, number, number]): [number, number, number] {
        if (!container.current) return world;
        const v = new Vector3(...world);
        container.current.worldToLocal(v);
        return [v.x, v.y, v.z];
    }

    return (
        <>
            <RigidBody colliders={false} lockRotations ref={rb} position={[0, 4, 0]} name={name} >
                <group ref={container}>
                    <FollowCam height={1 / height}
                        verticalRotation={verticalRotation}
                        cameraOffset={shoulderCamMode ? new Vector3(-0.5, 0.8, -0.3) : new Vector3(0, 0.2, -0.8)}
                        targetOffset={shoulderCamMode ? new Vector3(0, 0.5, 1.5) : new Vector3(0, 0.5, 1.5)}
                    />
                    <group ref={character}>
                        <AnimatedModel
                            name={name}
                            model="rigga.glb"
                            animationOverrides={{
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