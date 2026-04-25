"use client";

import { PerspectiveCamera, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { capsule, filter, kcc, rigidBody, MotionType, type Filter, type RigidBody } from "crashcat";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, type RefObject } from "react";
import { gameEvents, PrefabEditorMode, useEditorContext } from "react-three-game";
import type { CrashcatRuntimeRef } from "@/app/components/CrashcatRuntime";
import { useControls } from "@/app/react-three-controller/controls/ControlsProvider";
import useInputStore from "@/app/react-three-controller/controls/InputStore";
import { Group, MathUtils, Quaternion, Raycaster, Vector2, Vector3, type Object3D } from "three";

const DEFAULT_MAX_SPEED = 7;
const DEFAULT_GROUND_ACCEL = 18;
const DEFAULT_AIR_ACCEL = 6;
const DEFAULT_FRICTION = 10;
const DEFAULT_JUMP_SPEED = 6.5;
const DEFAULT_FOOTSTEP_EVENT = "player:footstep";
const DEFAULT_FOOTSTEP_MIN_INTERVAL = 0.28;
const DEFAULT_FOOTSTEP_MAX_INTERVAL = 0.48;
const DEFAULT_FOOTSTEP_MIN_SPEED = 1.5;
const FOOTSTEP_CLIPS = ["/sound/hit.mp3", "/sound/hit2.mp3"] as const;
const DEFAULT_RADIUS = 0.35;
const DEFAULT_HALF_HEIGHT = 0.45;
const DEFAULT_CAMERA_HEIGHT = 0.54;
const DEFAULT_GRAB_DISTANCE = 2.75;
const DEFAULT_GRAB_RANGE = 8;
const DEFAULT_GRAB_STRENGTH = 18;
const DEFAULT_GRAB_MAX_SPEED = 14;
const DEFAULT_LAUNCH_SPEED = 18;
const MOUSE_SENSITIVITY = 0.002;
const JOYSTICK_SENSITIVITY = 1.8;
const CAMERA_SWAY_AMOUNT = 0.045;
const CAMERA_SWAY_LERP = 10;
const PITCH_MIN = -1.45;
const PITCH_MAX = 1.45;
const GRAVITY: [number, number, number] = [0, -9.81, 0];
const PLAYER_ID = "player";
const HAND_MODEL_URL = "/models/environment/picocad/hand1.glb";

const forwardVector = new Vector3();
const rightVector = new Vector3();
const wishVector = new Vector3();
const planarVelocityVector = new Vector3();
const worldUp = new Vector3(0, 1, 0);
const groupPosition = new Vector3();
const identityQuaternion = new Quaternion();
const centerScreen = new Vector2(0, 0);
const raycaster = new Raycaster();
const grabTargetPosition = new Vector3();
const grabBodyPosition = new Vector3();
const grabVelocity = new Vector3();
const grabQuaternion = new Quaternion();
const cameraWorldQuaternion = new Quaternion();

export type FirstPersonPlayerProps = {
    runtimeRef: RefObject<CrashcatRuntimeRef | null>;
    radius?: number;
    halfHeightOfCylinder?: number;
    maxSpeed?: number;
    groundAccel?: number;
    airAccel?: number;
    friction?: number;
    jumpSpeed?: number;
    footstepEventName?: string;
    footstepMinInterval?: number;
    footstepMaxInterval?: number;
    footstepMinSpeed?: number;
    cameraHeight?: number;
    spawnPosition?: [number, number, number];
};

export interface FirstPersonPlayerRef {
    getBody: () => RigidBody | null;
}

function moveToward(current: number, target: number, maxDelta: number) {
    if (current < target) return Math.min(current + maxDelta, target);
    if (current > target) return Math.max(current - maxDelta, target);
    return current;
}

function getPrefabNodeId(object: Object3D | null | undefined) {
    let current: Object3D | null | undefined = object;

    while (current) {
        if (typeof current.userData?.prefabNodeId === "string") {
            return current.userData.prefabNodeId;
        }

        current = current.parent;
    }

    return null;
}

function HandViewModel() {
    const { scene: handScene } = useGLTF(HAND_MODEL_URL);
    const handModel = useMemo(() => handScene.clone(), [handScene]);

    return (
        <primitive
            object={handModel}
            position={[0.2, -0.15, -0.28]}
            rotation={[0, -Math.PI / 1.8, 0.2]}
            scale={0.025}
        />
    );
}

const FirstPersonPlayer = forwardRef<FirstPersonPlayerRef, FirstPersonPlayerProps>(function FirstPersonPlayer({
    runtimeRef,
    radius = DEFAULT_RADIUS,
    halfHeightOfCylinder = DEFAULT_HALF_HEIGHT,
    maxSpeed = DEFAULT_MAX_SPEED,
    groundAccel = DEFAULT_GROUND_ACCEL,
    airAccel = DEFAULT_AIR_ACCEL,
    friction = DEFAULT_FRICTION,
    jumpSpeed = DEFAULT_JUMP_SPEED,
    footstepEventName = DEFAULT_FOOTSTEP_EVENT,
    footstepMinInterval = DEFAULT_FOOTSTEP_MIN_INTERVAL,
    footstepMaxInterval = DEFAULT_FOOTSTEP_MAX_INTERVAL,
    footstepMinSpeed = DEFAULT_FOOTSTEP_MIN_SPEED,
    cameraHeight = DEFAULT_CAMERA_HEIGHT,
    spawnPosition = [0, 1.3, 6],
}, ref) {
    const { mode } = useEditorContext();
    const { setLookHandler } = useControls();
    const horizontalInput = useInputStore((state) => state.horizontal);
    const verticalInput = useInputStore((state) => state.vertical);
    const lookHorizontal = useInputStore((state) => state.lookHorizontal);
    const lookVertical = useInputStore((state) => state.lookVertical);
    const jumpPressed = useInputStore((state) => state.jump);
    const playerGroupRef = useRef<Group>(null);
    const cameraRigRef = useRef<Group>(null);
    const cameraSwayRef = useRef<Group>(null);
    const planarVelocityRef = useRef(new Vector3());
    const footstepTimerRef = useRef(0);
    const characterRef = useRef<ReturnType<typeof kcc.create> | null>(null);
    const updateSettingsRef = useRef(kcc.createDefaultUpdateSettings());
    const cameraYawRef = useRef(0);
    const cameraPitchRef = useRef(0);
    const jumpQueuedRef = useRef(false);
    const jumpPressedLastFrameRef = useRef(false);
    const characterFilterRef = useRef<Filter | null>(null);
    const playerBodyRef = useRef<RigidBody | null>(null);
    const footstepAudioRefs = useRef<HTMLAudioElement[]>([]);
    const grabbedNodeIdRef = useRef<string | null>(null);
    const grabbedRotationOffsetRef = useRef(new Quaternion());
    const lastFirePressedRef = useRef(false);
    const lastAimPressedRef = useRef(false);
    const firePressed = useInputStore((state) => state.fire);
    const aimPressed = useInputStore((state) => state.aim);

    useImperativeHandle(ref, () => ({
        getBody: () => playerBodyRef.current,
    }), []);

    useEffect(() => {
        if (mode === PrefabEditorMode.Play) {
            return;
        }

        characterRef.current = null;
        characterFilterRef.current = null;
        planarVelocityRef.current.set(0, 0, 0);
        footstepTimerRef.current = 0;
        jumpQueuedRef.current = false;
        jumpPressedLastFrameRef.current = false;
        grabbedNodeIdRef.current = null;
        grabbedRotationOffsetRef.current.identity();
        cameraYawRef.current = 0;
        cameraPitchRef.current = 0;
        lastFirePressedRef.current = false;
        lastAimPressedRef.current = false;
    }, [mode]);

    const applyLookDelta = useCallback((dx: number, dy: number) => {
        cameraYawRef.current -= dx * MOUSE_SENSITIVITY;
        cameraPitchRef.current = MathUtils.clamp(cameraPitchRef.current - dy * MOUSE_SENSITIVITY, PITCH_MIN, PITCH_MAX);
    }, []);

    useEffect(() => {
        setLookHandler(applyLookDelta);

        return () => {
            setLookHandler(null);
        };
    }, [applyLookDelta, setLookHandler]);

    useEffect(() => {
        if (mode !== PrefabEditorMode.Play) {
            return;
        }

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        };

        window.addEventListener("contextmenu", handleContextMenu);

        return () => {
            window.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [mode]);

    useEffect(() => {
        footstepAudioRefs.current = FOOTSTEP_CLIPS.map((clip) => {
            const audio = new Audio(clip);
            audio.preload = "auto";
            return audio;
        });

        return () => {
            footstepAudioRefs.current.forEach((audio) => {
                audio.pause();
                audio.src = "";
            });
            footstepAudioRefs.current = [];
        };
    }, []);

    const playFootstepSound = () => {
        const clips = footstepAudioRefs.current;
        if (clips.length === 0) {
            return;
        }

        const source = clips[Math.floor(Math.random() * clips.length)];
        const audio = source.cloneNode() as HTMLAudioElement;
        audio.volume = 0.2 + Math.random() * 0.12;
        audio.playbackRate = 0.9 + Math.random() * 0.14;
        void audio.play().catch(() => { });
    };

    useEffect(() => {
        if (mode !== PrefabEditorMode.Play) {
            return;
        }

        const runtime = runtimeRef.current;
        const world = runtime?.world;
        if (!world || playerBodyRef.current) {
            return;
        }

        playerBodyRef.current = rigidBody.create(world, {
            shape: capsule.create({
                radius,
                halfHeightOfCylinder,
            }),
            motionType: MotionType.KINEMATIC,
            objectLayer: runtime.movingObjectLayer,
            position: spawnPosition,
            quaternion: [0, 0, 0, 1],
            collideKinematicVsNonDynamic: true,
            friction: 0,
            userData: { nodeId: PLAYER_ID },
        });

        return () => {
            if (!playerBodyRef.current) {
                return;
            }

            rigidBody.remove(world, playerBodyRef.current);
            playerBodyRef.current = null;
        };
    }, [halfHeightOfCylinder, mode, radius, runtimeRef, spawnPosition]);

    useFrame((state, delta) => {
        if (mode !== PrefabEditorMode.Play) {
            return;
        }

        if (Math.abs(lookHorizontal) > 0.01) {
            cameraYawRef.current += lookHorizontal * JOYSTICK_SENSITIVITY * delta;
        }
        if (Math.abs(lookVertical) > 0.01) {
            cameraPitchRef.current = MathUtils.clamp(cameraPitchRef.current - lookVertical * JOYSTICK_SENSITIVITY * delta, PITCH_MIN, PITCH_MAX);
        }

        const cameraRig = cameraRigRef.current;
        if (cameraRig) {
            cameraRig.rotation.order = "YXZ";
            cameraRig.rotation.y = cameraYawRef.current;
            cameraRig.rotation.x = cameraPitchRef.current;
            cameraRig.rotation.z = 0;
        }

        const cameraSway = cameraSwayRef.current;
        if (cameraSway) {
            const targetSway = -horizontalInput * CAMERA_SWAY_AMOUNT;
            cameraSway.rotation.z = MathUtils.lerp(cameraSway.rotation.z, targetSway, Math.min(1, CAMERA_SWAY_LERP * delta));
        }

        state.camera.updateMatrixWorld();

        if (jumpPressed && !jumpPressedLastFrameRef.current) {
            jumpQueuedRef.current = true;
        }
        jumpPressedLastFrameRef.current = jumpPressed;

        const runtime = runtimeRef.current;
        const world = runtime?.world;
        const baseQueryFilter = runtime?.queryFilter;
        const playerGroup = playerGroupRef.current;
        if (!world || !baseQueryFilter || !playerGroup) {
            return;
        }

        const tryGrabTarget = () => {
            raycaster.setFromCamera(centerScreen, state.camera);

            const intersections = raycaster.intersectObjects(state.scene.children, true);
            for (const intersection of intersections) {
                const nodeId = getPrefabNodeId(intersection.object);
                if (!nodeId) {
                    continue;
                }

                const body = runtime?.getBody(nodeId);
                if (!body || body.motionType !== MotionType.DYNAMIC || nodeId === PLAYER_ID) {
                    continue;
                }

                if (intersection.distance > DEFAULT_GRAB_RANGE) {
                    return;
                }

                grabbedNodeIdRef.current = nodeId;
                grabQuaternion.set(body.quaternion[0], body.quaternion[1], body.quaternion[2], body.quaternion[3]);
                state.camera.getWorldQuaternion(cameraWorldQuaternion);
                grabbedRotationOffsetRef.current.copy(cameraWorldQuaternion).invert().multiply(grabQuaternion);
                rigidBody.setAngularVelocity(world, body, [0, 0, 0]);
                return;
            }
        };

        const releaseGrabbed = (launch = false) => {
            const grabbedNodeId = grabbedNodeIdRef.current;
            if (!grabbedNodeId) {
                return;
            }

            const body = runtime?.getBody(grabbedNodeId);
            if (body && launch) {
                state.camera.getWorldDirection(forwardVector);
                forwardVector.normalize();
                grabVelocity.copy(forwardVector).multiplyScalar(DEFAULT_LAUNCH_SPEED);
                grabVelocity.add(planarVelocityVector);
                rigidBody.setAngularVelocity(world, body, [0, 0, 0]);
                rigidBody.setLinearVelocity(world, body, [grabVelocity.x, grabVelocity.y, grabVelocity.z]);
            }

            grabbedNodeIdRef.current = null;
        };

        const aimPressedThisFrame = aimPressed && !lastAimPressedRef.current;
        const firePressedThisFrame = firePressed && !lastFirePressedRef.current;

        if (aimPressedThisFrame) {
            if (grabbedNodeIdRef.current) {
                releaseGrabbed(false);
            } else {
                tryGrabTarget();
            }
        }

        if (firePressedThisFrame && grabbedNodeIdRef.current) {
            releaseGrabbed(true);
        }

        lastAimPressedRef.current = aimPressed;
        lastFirePressedRef.current = firePressed;

        if (!characterRef.current) {
            planarVelocityRef.current.set(0, 0, 0);
            footstepTimerRef.current = 0;
            jumpQueuedRef.current = false;
            jumpPressedLastFrameRef.current = jumpPressed;
            characterRef.current = kcc.create({
                shape: capsule.create({
                    radius,
                    halfHeightOfCylinder,
                }),
                maxSlopeAngle: Math.PI / 3,
                characterPadding: 0.02,
            }, spawnPosition, [0, 0, 0, 1]);
        }

        if (!characterFilterRef.current) {
            characterFilterRef.current = filter.forWorld(world);
        }

        const character = characterRef.current;
        const characterFilter = characterFilterRef.current;
        filter.copy(characterFilter, baseQueryFilter);
        characterFilter.bodyFilter = playerBodyRef.current ? (body) => body !== playerBodyRef.current : undefined;

        const forwardInput = verticalInput;
        const rightInput = horizontalInput;

        state.camera.getWorldDirection(forwardVector);
        forwardVector.y = 0;

        if (forwardVector.lengthSq() < 1e-6) {
            forwardVector.set(0, 0, -1);
        } else {
            forwardVector.normalize();
        }

        rightVector.crossVectors(forwardVector, worldUp).normalize();

        wishVector
            .copy(forwardVector)
            .multiplyScalar(forwardInput)
            .addScaledVector(rightVector, rightInput);

        const stepDelta = Math.min(delta, 1 / 30);
        kcc.refreshContacts(world, character, characterFilter);
        const grounded = kcc.isSupported(character);
        const planarVelocity = planarVelocityRef.current;
        const currentVelocityY = character.linearVelocity[1];

        const desiredPlanarSpeed = wishVector.lengthSq() > 0
            ? wishVector.normalize().multiplyScalar(maxSpeed)
            : wishVector.set(0, 0, 0);

        const accel = grounded ? groundAccel : airAccel;
        const maxDelta = accel * delta;
        planarVelocity.set(
            moveToward(planarVelocity.x, desiredPlanarSpeed.x, maxDelta),
            0,
            moveToward(planarVelocity.z, desiredPlanarSpeed.z, maxDelta),
        );

        if (grounded && planarVelocity.lengthSq() > 0 && desiredPlanarSpeed.lengthSq() === 0) {
            const damping = Math.max(0, 1 - friction * delta * 0.1);
            planarVelocity.multiplyScalar(damping);
        }

        if (grounded && jumpQueuedRef.current) {
            character.linearVelocity[1] = jumpSpeed;
            jumpQueuedRef.current = false;
        } else {
            character.linearVelocity[1] = grounded
                ? (currentVelocityY < 0 ? 0 : currentVelocityY)
                : currentVelocityY + GRAVITY[1] * stepDelta;
        }

        character.linearVelocity[0] = planarVelocity.x;
        character.linearVelocity[2] = planarVelocity.z;

        kcc.update(world, character, stepDelta, GRAVITY, updateSettingsRef.current, undefined, characterFilter);

        const speed = planarVelocity.length();
        const moving = grounded && desiredPlanarSpeed.lengthSq() > 0 && speed > footstepMinSpeed;

        if (!moving) {
            footstepTimerRef.current = 0;
        } else {
            footstepTimerRef.current -= delta;

            if (footstepTimerRef.current <= 0) {
                gameEvents.emit(footstepEventName, {
                    sourceEntityId: PLAYER_ID,
                    sourceNodeId: PLAYER_ID,
                    speed,
                });
                playFootstepSound();

                const speedAlpha = Math.min(speed / maxSpeed, 1);
                footstepTimerRef.current = footstepMaxInterval - (footstepMaxInterval - footstepMinInterval) * speedAlpha;
            }
        }

        groupPosition.set(character.position[0], character.position[1], character.position[2]);
        playerGroup.position.copy(groupPosition);
        playerGroup.quaternion.copy(identityQuaternion);
        playerGroup.updateMatrixWorld(true);

        if (playerBodyRef.current) {
            rigidBody.setPosition(world, playerBodyRef.current, [groupPosition.x, groupPosition.y, groupPosition.z], true);
            rigidBody.setQuaternion(world, playerBodyRef.current, [0, 0, 0, 1], true);
            planarVelocityVector.set(character.linearVelocity[0], character.linearVelocity[1], character.linearVelocity[2]);
            rigidBody.setLinearVelocity(world, playerBodyRef.current, [planarVelocityVector.x, planarVelocityVector.y, planarVelocityVector.z]);
        }

        const grabbedNodeId = grabbedNodeIdRef.current;
        if (!grabbedNodeId) {
            return;
        }

        const grabbedBody = runtime?.getBody(grabbedNodeId);
        if (!grabbedBody || grabbedBody.motionType !== MotionType.DYNAMIC) {
            grabbedNodeIdRef.current = null;
            return;
        }

        state.camera.getWorldPosition(grabTargetPosition);
        state.camera.getWorldDirection(forwardVector);
        forwardVector.normalize();
        grabTargetPosition.addScaledVector(forwardVector, DEFAULT_GRAB_DISTANCE);
        state.camera.getWorldQuaternion(cameraWorldQuaternion);
        grabQuaternion.copy(cameraWorldQuaternion).multiply(grabbedRotationOffsetRef.current);

        grabBodyPosition.set(grabbedBody.position[0], grabbedBody.position[1], grabbedBody.position[2]);
        if (grabBodyPosition.distanceToSquared(grabTargetPosition) > DEFAULT_GRAB_RANGE * DEFAULT_GRAB_RANGE * 2.25) {
            grabbedNodeIdRef.current = null;
            return;
        }

        grabVelocity
            .copy(grabTargetPosition)
            .sub(grabBodyPosition)
            .multiplyScalar(DEFAULT_GRAB_STRENGTH);

        if (grabVelocity.lengthSq() > DEFAULT_GRAB_MAX_SPEED * DEFAULT_GRAB_MAX_SPEED) {
            grabVelocity.setLength(DEFAULT_GRAB_MAX_SPEED);
        }

        rigidBody.setAngularVelocity(world, grabbedBody, [0, 0, 0]);
        rigidBody.setQuaternion(world, grabbedBody, [grabQuaternion.x, grabQuaternion.y, grabQuaternion.z, grabQuaternion.w], true);
        rigidBody.setLinearVelocity(world, grabbedBody, [grabVelocity.x, grabVelocity.y, grabVelocity.z]);
    });

    if (mode !== PrefabEditorMode.Play) {
        return null;
    }

    return (
        <>
            <group ref={playerGroupRef} position={spawnPosition}>
                <group ref={cameraRigRef} position={[0, cameraHeight, 0]}>
                    <HandViewModel />
                    <group ref={cameraSwayRef}>
                        <PerspectiveCamera makeDefault fov={90} near={0.1} far={1000} />
                    </group>
                </group>
            </group>
        </>
    );
});

useGLTF.preload(HAND_MODEL_URL);

export default FirstPersonPlayer;
