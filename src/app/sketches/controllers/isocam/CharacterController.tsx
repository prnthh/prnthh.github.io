import { Box, OrbitControls, PerspectiveCamera, useKeyboardControls } from "@react-three/drei";
import { Camera, useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import { useEffect, useRef, useState, MutableRefObject, useMemo, useCallback } from "react";
import { MathUtils, Vector3, Group, Euler, Quaternion } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import AnimatedModel from "@/shared/HumanoidModel";
import * as THREE from "three";
import { FollowCam } from "../../../../shared/FollowCam";

const normalizeAngle = (angle: number): number => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
};

const lerpAngle = (start: number, end: number, t: number): number => {
    start = normalizeAngle(start);
    end = normalizeAngle(end);

    if (Math.abs(end - start) > Math.PI) {
        if (end > start) {
            start += 2 * Math.PI;
        } else {
            end += 2 * Math.PI;
        }
    }

    return normalizeAngle(start + (end - start) * t);
};

export const CharacterController = () => {
    const WALK_SPEED = 2, RUN_SPEED = 4, JUMP_FORCE = 4.5;

    const height = 0.95
    const roundHeight = 0.25

    const { rapier, world } = useRapier();
    const rb = useRef<RapierRigidBody | null>(null);
    const container = useRef<Group>(null);
    const character = useRef<Group>(null);
    const characterRotationTarget = useRef<number>(0);
    const rotationTarget = useRef<number>(0);

    const [, get] = useKeyboardControls();
    const isPointerLocked = useRef<boolean>(false);
    const lastMouseX = useRef<number | null>(null);
    const [animation, setAnimation] = useState<"idle" | "walk" | "run" | "jump">("idle");
    const [shoulderCamMode, setShoulderCamMode] = useState(false);

    const velocityRef = useRef<Vector3>(new Vector3(0, 0, 0));
    const isVelocityRefDirty = useRef<boolean>(false);
    const canJump = useRef<boolean>(true);

    useFrame(({ camera }) => {
        if (rb.current) {
            const dir = rb.current.linvel();
            velocityRef.current.set(dir.x, dir.y, dir.z);

            const keyInputs = get();
            let moveX = 0, moveZ = 0;

            // Handle movement
            if (keyInputs.forward) moveZ += 1;
            if (keyInputs.backward) moveZ -= 1;
            if (keyInputs.left) moveX += 1;
            if (keyInputs.right) moveX -= 1;

            const speed = get().run ? RUN_SPEED : WALK_SPEED;

            if ((moveX !== 0 || moveZ !== 0)) {
                const dir = new Vector3(moveX, 0, moveZ).normalize();
                dir.applyAxisAngle(new Vector3(0, 1, 0), rotationTarget.current);

                // Apply movement with current Y velocity preserved
                velocityRef.current.set(dir.x * speed, velocityRef.current.y, dir.z * speed);
                isVelocityRefDirty.current = true;
                setAnimation(speed === RUN_SPEED ? "run" : "walk");
            } else {
                setAnimation("idle");
            }

            // Apply rotation to the container
            if (container.current) {
                container.current.rotation.y = rotationTarget.current;
            }

            if (!canJump.current) {
                if (checkGrounded()) {
                    canJump.current = true; // Reset jump state if grounded
                }
            } else if (keyInputs.jump && canJump.current) {
                if (!rb.current || !rapier) return;
                rb.current.wakeUp?.();

                if ((keyInputs.jump && canJump.current)) {
                    if (checkGrounded()) {
                        // Set the velocity directly, just like x/z movement
                        velocityRef.current.y = JUMP_FORCE; // Ensure Y velocity is set for jump
                        isVelocityRefDirty.current = true;
                        canJump.current = false;
                        setAnimation("jump");
                    }
                }
            }

            if (isVelocityRefDirty.current) {
                rb.current.setLinvel(velocityRef.current, true);
                isVelocityRefDirty.current = false;
            }
        }
    });


    const checkGrounded = useMemo(() => {
        return () => {
            if (!rb.current || !rapier) return false;
            const origin = rb.current.translation();
            const rayOrigin = { x: origin.x, y: origin.y - (height / 2) - 0.01, z: origin.z };
            const direction = { x: 0, y: -1, z: 0 };
            const ray = new rapier.Ray(rayOrigin, direction);
            const maxToi = 0.3;
            const solid = true;
            const hit = world.castRay(ray, maxToi, solid);
            return !!hit && hit.timeOfImpact < 0.15 && Math.abs(rb.current.linvel().y) < 0.2;
        };
    }, [rb, rapier, world, height]);

    return (
        <RigidBody colliders={false} lockRotations ref={rb} position={[0, 4, 0]}>
            <PerspectiveCamera />
            <OrbitControls />
            <group ref={container}>
                <group ref={character}>
                    <AnimatedModel
                        model="/models/rigga.glb"
                        animation={animation}
                        height={height}
                    />
                </group>
            </group>
            <CapsuleCollider args={[(height - (roundHeight * 1.9)) / 2, roundHeight]} position={[0, (height / 2), 0]} />
        </RigidBody>
    );
};