/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license found in the LICENSE
 * file in the root directory of this source tree.
 */

import { CapsuleCollider, RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import { Vector3, Quaternion, } from "three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PerspectiveCamera } from "@react-three/drei";
import PointerLockControls from "@/shared/controls/PointerLockControls";
import { useInputStore } from "../providers/InputStore";
import { KeyboardInput } from "./KeyboardInput";
import Gun from "@/app/sketches/demos/killbox/Gun";


const tempQuat = new Quaternion();
const tempYawQuat = new Quaternion();

const PLAYER_MASS = 70;
const WALK_SPEED = 5;
const SPRINT_SPEED = 12;
const JUMP_VELOCITY = 5;
const FLOAT_SPRING = 8;
const FLOAT_DAMPING = 0.3;
const PITCH_LIMIT = Math.PI / 2;
const MOUSE_SENSITIVITY = 0.002;
const JOYSTICK_SENSITIVITY = 2.5;


const FirstPersonController = ({
    name = "bob",
    height = 1,
    cameraOffset = [0, 0, 0],
    spawnPosition = [0, 2, 0],
    children, forwardRef
}: {
    name?: string,
    height?: number,
    cameraOffset?: [number, number, number],
    spawnPosition?: [number, number, number],
    children?: React.ReactNode,
    forwardRef?: (refs: { rbref: React.RefObject<RapierRigidBody | null>, meshref: React.RefObject<THREE.Group | null>, cameraRigRef: React.RefObject<THREE.Group | null> }) => void
}) => {
    const rigidBodyRef = useRef<RapierRigidBody | null>(null);
    const bodyMeshRef = useRef<THREE.Group | null>(null);
    const cameraRigRef = useRef<THREE.Group | null>(null);
    const cameraPitch = useRef(0);

    const CAPSULE_RADIUS = height / 5;
    const CAPSULE_HEIGHT = height / 2;
    const EYE_HEIGHT = CAPSULE_HEIGHT;

    useEffect(() => {
        if (typeof forwardRef === 'function') {
            forwardRef({ rbref: rigidBodyRef, meshref: bodyMeshRef, cameraRigRef: cameraRigRef });
        }
    }, [forwardRef]);

    // Shared look logic - processes movement deltas directly
    const applyLookDelta = (dx: number, dy: number) => {
        const rb = rigidBodyRef.current;
        if (!rb) return;

        const yawDelta = -dx * MOUSE_SENSITIVITY;
        const rot = rb.rotation();
        tempQuat.set(rot.x, rot.y, rot.z, rot.w);
        tempYawQuat.setFromAxisAngle({ x: 0, y: 1, z: 0 }, yawDelta);
        tempQuat.premultiply(tempYawQuat);
        rb.setRotation(tempQuat, true);

        cameraPitch.current = THREE.MathUtils.clamp(
            cameraPitch.current - dy * MOUSE_SENSITIVITY,
            -PITCH_LIMIT,
            PITCH_LIMIT
        );

        if (cameraRigRef.current) {
            cameraRigRef.current.rotation.x = cameraPitch.current;
        }
    };

    return (
        <RigidBody
            name={name}
            ccd
            position={spawnPosition}
            colliders={false}
            ref={rigidBodyRef}
            type="dynamic"
            mass={PLAYER_MASS}
            angularDamping={1}
            linearDamping={0}
            enabledRotations={[false, false, false]}
        >
            <CapsuleCollider args={[CAPSULE_HEIGHT, CAPSULE_RADIUS]} />
            <group ref={bodyMeshRef} position={[0, -(CAPSULE_HEIGHT + CAPSULE_RADIUS), 0]} rotation={[0, Math.PI, 0]}>
                {children}
            </group>
            {!children && <mesh castShadow onBeforeRender={() => { }}>
                <capsuleGeometry args={[CAPSULE_RADIUS, height, 8, 16]} />
                <meshStandardMaterial color="orange" />
            </mesh>}

            <group name='cameraRig' position={[0, EYE_HEIGHT, 0]} ref={cameraRigRef}>
                <group name='camera' position={cameraOffset} >
                    <PerspectiveCamera makeDefault />
                </group>
                <group position={[0.2, -0.2, -0.5]} scale={0.5}>
                    <Gun />
                </group>

            </group>

            <KeyboardInput />
            <MovementSystem height={CAPSULE_HEIGHT} rigidBodyRef={rigidBodyRef} />
            <LookSystem rigidBodyRef={rigidBodyRef} cameraRigRef={cameraRigRef} cameraPitch={cameraPitch} />
            <PointerLockControls onLook={applyLookDelta} />
        </RigidBody>
    );
};



const tempForward = new Vector3();
const tempRight = new Vector3();
const tempDirection = new Vector3();
const tempRayOrigin = new Vector3();

const MovementSystem = ({ height = 0.5, rigidBodyRef }: { height?: number, rigidBodyRef: React.RefObject<RapierRigidBody | null> }) => {
    const horizontal = useInputStore(state => state.horizontal);
    const vertical = useInputStore(state => state.vertical);
    const sprint = useInputStore(state => state.sprint);
    const jump = useInputStore(state => state.jump);
    const rapier = useRapier();

    const velocityRef = useRef({ x: 0, y: 0, z: 0 });
    const dirtyRef = useRef(false);

    useFrame(() => {
        const rb = rigidBodyRef.current;
        if (!rb) return;

        const vel = rb.linvel();
        velocityRef.current.x = vel.x;
        velocityRef.current.y = vel.y;
        velocityRef.current.z = vel.z;
        dirtyRef.current = false;
        const currentSpeed = sprint ? SPRINT_SPEED : WALK_SPEED;

        const pos = rb.translation();
        tempRayOrigin.set(pos.x, pos.y - height, pos.z);
        const ray = new rapier.rapier.Ray(tempRayOrigin, { x: 0, y: -1, z: 0 });
        const hit = rapier.world.castRay(ray, 10, true, rapier.rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, rb);

        const isGrounded = hit && hit.timeOfImpact < height + 0.1;

        if (hit && hit.timeOfImpact < height) {
            const heightError = height - hit.timeOfImpact;
            const targetUpwardVel = heightError * FLOAT_SPRING;
            velocityRef.current.y = velocityRef.current.y * (1 - FLOAT_DAMPING) + targetUpwardVel * FLOAT_DAMPING;
            rb.setGravityScale(0, true);
            dirtyRef.current = true;

            if (jump && isGrounded) {
                velocityRef.current.y = JUMP_VELOCITY;
                rb.setGravityScale(1, true);
            }
        } else {
            rb.setGravityScale(1, true);
        }

        const rot = rb.rotation();
        tempQuat.set(rot.x, rot.y, rot.z, rot.w);
        tempForward.set(0, 0, -1).applyQuaternion(tempQuat).setY(0).normalize();
        tempRight.set(1, 0, 0).applyQuaternion(tempQuat).setY(0).normalize();

        tempDirection.set(0, 0, 0)
            .addScaledVector(tempForward, vertical)
            .addScaledVector(tempRight, horizontal);

        const inputMagnitude = tempDirection.length();
        if (inputMagnitude > 0) {
            tempDirection.multiplyScalar(currentSpeed / inputMagnitude);
            velocityRef.current.x = tempDirection.x;
            velocityRef.current.z = tempDirection.z;
            dirtyRef.current = true;
        } else if (isGrounded) {
            velocityRef.current.x = 0;
            velocityRef.current.z = 0;
            dirtyRef.current = true;
        }

        // Add ground velocity if standing on a moving object
        if (hit && isGrounded) {
            const groundCollider = hit.collider;
            const groundRigidBody = groundCollider.parent();
            if (groundRigidBody && !groundRigidBody.isFixed()) {
                const groundLinvel = groundRigidBody.linvel();
                const speed = Math.sqrt(groundLinvel.x ** 2 + groundLinvel.y ** 2 + groundLinvel.z ** 2);
                if (speed > 0.01) {
                    velocityRef.current.x += groundLinvel.x;
                    velocityRef.current.z += groundLinvel.z;
                    dirtyRef.current = true;
                }
            }
        }

        if (dirtyRef.current) {
            rb.setLinvel(velocityRef.current, true);
        }
    });

    return null;
};

const LookSystem = ({
    rigidBodyRef,
    cameraRigRef,
    cameraPitch
}: {
    rigidBodyRef: React.RefObject<RapierRigidBody | null>;
    cameraRigRef: React.RefObject<THREE.Group | null>;
    cameraPitch: React.MutableRefObject<number>;
}) => {
    const lookHorizontal = useInputStore(state => state.lookHorizontal);
    const lookVertical = useInputStore(state => state.lookVertical);

    useFrame((_, delta) => {
        const rb = rigidBodyRef.current;
        const rig = cameraRigRef.current;
        if (!rb || !rig) return;

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
            cameraPitch.current = THREE.MathUtils.clamp(
                cameraPitch.current + lookVertical * JOYSTICK_SENSITIVITY * delta,
                -PITCH_LIMIT,
                PITCH_LIMIT
            );
            rig.rotation.x = cameraPitch.current;
        }
    });

    return null;
};

export default FirstPersonController;