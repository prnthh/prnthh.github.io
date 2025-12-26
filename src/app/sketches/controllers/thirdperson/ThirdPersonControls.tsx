/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useEffect, useRef, useState, useCallback, RefObject } from "react";
import { Vector3, Quaternion, Object3D, AnimationAction, MathUtils } from "three";
import FollowCam from "@/shared/cameras/FollowCam";
import { Weapon } from "../firstperson/Weapon";
import { RigidHumanoidModelRef } from "@/shared/ped/physics/types";
import useInputStore from "../controls/InputStore";
import KeyboardControls from "../controls/KeyboardControls";
import PointerLockControls from "../controls/PointerLockControls";

const tempQuat = new Quaternion();
const tempYawQuat = new Quaternion();
const tempForward = new Vector3();
const tempRight = new Vector3();
const tempDirection = new Vector3();

const MOUSE_SENSITIVITY = 0.002;
const JOYSTICK_SENSITIVITY = 2.5;
const PITCH_LIMIT = Math.PI / 2; // 90 degrees up/down

interface ThirdPersonControlsProps {
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    height: number;
    roundHeight: number;
    walkSpeed?: number;
    runSpeed?: number;
    jumpForce?: number;
    lookTarget?: RefObject<Object3D | null>;
}

const ThirdPersonControls = ({
    modelRef,
    height,
    roundHeight,
    walkSpeed = 1.2,
    runSpeed = 3,
    jumpForce = 1,
    lookTarget,
}: ThirdPersonControlsProps) => {
    const verticalRotation = useRef(0);
    const walkActionRef = useRef<AnimationAction | null>(null);
    const walkLeftActionRef = useRef<AnimationAction | null>(null);
    const runActionRef = useRef<AnimationAction | null>(null);

    const [animation, setAnimation] = useState<"idle" | "walk" | "run" | "jump" | "walkLeft" | "lpunch" | "rpunch" | string[]>("idle");
    const [shoulderCamMode, setShoulderCamMode] = useState(false);
    const tap = useInputStore(state => state.tap);

    // Shared look logic - processes movement deltas directly
    const applyLookDelta = useCallback((dx: number, dy: number) => {
        if (!modelRef.current?.rbref.current) return;

        const rb = modelRef.current.rbref.current;
        const yawDelta = -dx * MOUSE_SENSITIVITY;
        const rot = rb.rotation();
        tempQuat.set(rot.x, rot.y, rot.z, rot.w);
        tempYawQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, yawDelta);
        tempQuat.premultiply(tempYawQuat);
        rb.setRotation(tempQuat, true);

        verticalRotation.current = MathUtils.clamp(
            verticalRotation.current + dy * MOUSE_SENSITIVITY,
            -PITCH_LIMIT,
            PITCH_LIMIT
        );
    }, [modelRef]);

    // Update animation on the model
    useEffect(() => {
        if (modelRef.current?.setAnimation) {
            modelRef.current.setAnimation(animation);
        }
    }, [animation, modelRef]);

    return (
        <>
            <MovementSystem
                modelRef={modelRef}
                height={height}
                roundHeight={roundHeight}
                animation={animation}
                setAnimation={setAnimation}
                walkActionRef={walkActionRef}
                walkLeftActionRef={walkLeftActionRef}
                runActionRef={runActionRef}
                walkSpeed={walkSpeed}
                runSpeed={runSpeed}
                jumpForce={jumpForce}
            />
            <LookSystem
                modelRef={modelRef}
                verticalRotation={verticalRotation}
            />
            <group position={[0, -height / 2, 0]}>
                <FollowCam
                    height={1 / height}
                    verticalRotation={verticalRotation}
                    cameraOffset={
                        shoulderCamMode
                            ? [-0.5, 1.5, -0.5]
                            : [0, 1.5, -1.5]
                    }
                    targetOffset={
                        shoulderCamMode
                            ? [0, 0.5, 1.5]
                            : [0, 0.5, 1.5]
                    }
                />
            </group>
            <PointerLockControls
                onLook={applyLookDelta}
                onClick={() => { shoulderCamMode && tap(); }}
                onRightClickDown={() => setShoulderCamMode(true)}
                onRightClickUp={() => setShoulderCamMode(false)}
            />
            <KeyboardControls />
            {shoulderCamMode && <Weapon excludeRigidBody={modelRef.current?.rbref} />}
        </>
    );
};

export default ThirdPersonControls;

// Movement System - handles character movement, jumping, and animations
export const MovementSystem = ({
    modelRef,
    height,
    roundHeight,
    animation,
    setAnimation,
    walkActionRef,
    walkLeftActionRef,
    runActionRef,
    walkSpeed,
    runSpeed,
    jumpForce,
}: {
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    height: number;
    roundHeight: number;
    animation: "idle" | "walk" | "run" | "jump" | "walkLeft" | "lpunch" | "rpunch" | string[];
    setAnimation: (anim: "idle" | "walk" | "run" | "jump" | "walkLeft" | "lpunch" | "rpunch" | string[]) => void;
    walkActionRef: RefObject<AnimationAction | null>;
    walkLeftActionRef: RefObject<AnimationAction | null>;
    runActionRef: RefObject<AnimationAction | null>;
    walkSpeed: number;
    runSpeed: number;
    jumpForce: number;
}) => {
    const horizontal = useInputStore(state => state.horizontal);
    const vertical = useInputStore(state => state.vertical);
    const sprint = useInputStore(state => state.sprint);
    const jump = useInputStore(state => state.jump);
    const use = useInputStore(state => state.use);
    const altUse = useInputStore(state => state.altUse);

    const { rapier, world } = useRapier();
    const velocityRef = useRef<Vector3>(new Vector3(0, 0, 0));
    const jumping = useRef(false);
    const jumpReleased = useRef(true);

    const checkGrounded = useCallback(() => {
        const rb = modelRef.current?.rbref.current;
        if (!rb || !rapier) return false;

        const origin = rb.translation();
        const rayOrigin = {
            x: origin.x,
            y: origin.y,
            z: origin.z
        };
        const direction = { x: 0, y: -1, z: 0 };
        const ray = new rapier.Ray(rayOrigin, direction);
        const maxToi = 0.1;
        const solid = true;

        const playerCollider = rb.collider(0);

        const hit = world.castRay(
            ray,
            maxToi,
            solid,
            undefined,
            undefined,
            playerCollider
        );

        const isGrounded = !!hit && hit.timeOfImpact < 0.1 && Math.abs(rb.linvel().y) < 0.1;

        // Add ground velocity if standing on a moving object
        if (hit && isGrounded) {
            const groundCollider = hit.collider;
            const groundRigidBody = groundCollider.parent();
            if (groundRigidBody && !groundRigidBody.isFixed()) {
                const groundLinvel = groundRigidBody.linvel();
                const speed = Math.sqrt(groundLinvel.x ** 2 + groundLinvel.y ** 2 + groundLinvel.z ** 2);
                if (speed > 0.01) {
                    const currentVel = rb.linvel();
                    rb.setLinvel({
                        x: currentVel.x + groundLinvel.x,
                        y: currentVel.y,
                        z: currentVel.z + groundLinvel.z
                    }, true);
                }
            }
        }

        return isGrounded;
    }, [modelRef, rapier, world]);

    useFrame(() => {
        const rb = modelRef.current?.rbref.current;
        if (!rb) return;

        const moveX = horizontal;
        const moveZ = vertical;
        const speed = sprint ? runSpeed : walkSpeed;
        const grounded = checkGrounded();

        // Handle jump
        if (!jump) jumpReleased.current = true;
        if (jumping.current && grounded) jumping.current = false;
        if (jump && jumpReleased.current && !jumping.current && grounded) {
            rb.wakeUp?.();
            rb.applyImpulse({ x: 0, y: jumpForce, z: 0 }, true);
            jumping.current = true;
            jumpReleased.current = false;
        }

        // Update animation
        let nextAnimation: typeof animation | string[] = "idle";

        if (use) {
            nextAnimation = "rpunch";
        } else if (altUse) {
            nextAnimation = "lpunch";
        } else if (jumping.current) {
            nextAnimation = "jump";
        } else if (moveX || moveZ) {
            const absX = Math.abs(moveX);
            const absZ = Math.abs(moveZ);

            if (absX > 0.3 && absX > absZ * 1.5) {
                nextAnimation = "walkLeft";
                if (walkLeftActionRef.current) walkLeftActionRef.current.timeScale = -moveX;
            } else {
                nextAnimation = speed === runSpeed ? "run" : "walk";
                if (walkActionRef.current) walkActionRef.current.timeScale = moveZ;
                if (runActionRef.current) runActionRef.current.timeScale = moveZ;
            }
        }

        setAnimation(nextAnimation);

        // Handle movement
        if (use || altUse) {
            velocityRef.current.set(0, rb.linvel().y, 0);
            rb.setLinvel(velocityRef.current, true);
        } else if (moveX || moveZ) {
            const rot = rb.rotation();
            tempQuat.set(rot.x, rot.y, rot.z, rot.w);

            tempForward.set(0, 0, 1).applyQuaternion(tempQuat).setY(0).normalize();
            tempRight.set(-1, 0, 0).applyQuaternion(tempQuat).setY(0).normalize();

            tempDirection.set(0, 0, 0)
                .addScaledVector(tempForward, moveZ)
                .addScaledVector(tempRight, moveX);

            const inputMagnitude = tempDirection.length();
            if (inputMagnitude > 0) {
                tempDirection.multiplyScalar(speed / inputMagnitude);
            }

            velocityRef.current.set(tempDirection.x, rb.linvel().y, tempDirection.z);
            rb.setLinvel(velocityRef.current, true);
        } else {
            velocityRef.current.set(0, rb.linvel().y, 0);
            rb.setLinvel(velocityRef.current, true);
        }
    });

    return null;
};

// Look System - handles joystick camera rotation
export const LookSystem = ({
    modelRef,
    verticalRotation,
}: {
    modelRef: RefObject<RigidHumanoidModelRef | null>;
    verticalRotation: React.MutableRefObject<number>;
}) => {
    const lookHorizontal = useInputStore(state => state.lookHorizontal);
    const lookVertical = useInputStore(state => state.lookVertical);

    useFrame((_, delta) => {
        const rb = modelRef.current?.rbref.current;
        if (!rb) return;

        const absHorizontal = Math.abs(lookHorizontal);
        const absVertical = Math.abs(lookVertical);

        if (absHorizontal > 0.01) {
            const yawDelta = -lookHorizontal * JOYSTICK_SENSITIVITY * delta;
            const rot = rb.rotation();
            tempQuat.set(rot.x, rot.y, rot.z, rot.w);
            tempYawQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, yawDelta);
            tempQuat.premultiply(tempYawQuat);
            rb.setRotation(tempQuat, true);
        }

        if (absVertical > 0.01) {
            verticalRotation.current = MathUtils.clamp(
                verticalRotation.current - lookVertical * JOYSTICK_SENSITIVITY * delta,
                -PITCH_LIMIT,
                PITCH_LIMIT
            );
        }
    });

    return null;
};
