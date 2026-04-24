"use client";

import { PerspectiveCamera, PointerLockControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { capsule, filter, kcc, rigidBody, MotionType, type Filter, type RigidBody } from "crashcat";
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from "react";
import { gameEvents, PrefabEditorMode, useEditorContext } from "react-three-game";
import type { CrashcatRuntimeRef } from "@/app/components/CrashcatRuntime";
import { Group, Quaternion, Vector3 } from "three";

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
const GRAVITY: [number, number, number] = [0, -9.81, 0];
const PLAYER_ID = "player";

const forwardKeys = new Set(["KeyW", "ArrowUp"]);
const backwardKeys = new Set(["KeyS", "ArrowDown"]);
const leftKeys = new Set(["KeyA", "ArrowLeft"]);
const rightKeys = new Set(["KeyD", "ArrowRight"]);

const forwardVector = new Vector3();
const rightVector = new Vector3();
const wishVector = new Vector3();
const planarVelocityVector = new Vector3();
const worldUp = new Vector3(0, 1, 0);
const groupPosition = new Vector3();
const identityQuaternion = new Quaternion();

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

function hasPressedKey(pressedKeys: Set<string>, keys: Set<string>) {
    for (const key of keys) {
        if (pressedKeys.has(key)) {
            return true;
        }
    }
    return false;
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
    const playerGroupRef = useRef<Group>(null);
    const planarVelocityRef = useRef(new Vector3());
    const footstepTimerRef = useRef(0);
    const characterRef = useRef<ReturnType<typeof kcc.create> | null>(null);
    const updateSettingsRef = useRef(kcc.createDefaultUpdateSettings());
    const pressedKeysRef = useRef(new Set<string>());
    const jumpQueuedRef = useRef(false);
    const characterFilterRef = useRef<Filter | null>(null);
    const playerBodyRef = useRef<RigidBody | null>(null);
    const footstepAudioRefs = useRef<HTMLAudioElement[]>([]);

    useImperativeHandle(ref, () => ({
        getBody: () => playerBodyRef.current,
    }), []);

    useEffect(() => {
        const setKey = (pressed: boolean) => (event: KeyboardEvent) => {
            if (event.code === "Space") {
                if (pressed && !event.repeat) {
                    jumpQueuedRef.current = true;
                }
                return;
            }

            if (!forwardKeys.has(event.code)
                && !backwardKeys.has(event.code)
                && !leftKeys.has(event.code)
                && !rightKeys.has(event.code)) {
                return;
            }

            if (pressed) {
                pressedKeysRef.current.add(event.code);
            } else {
                pressedKeysRef.current.delete(event.code);
            }
        };

        const handleKeyDown = setKey(true);
        const handleKeyUp = setKey(false);
        const clearInput = () => {
            pressedKeysRef.current.clear();
            jumpQueuedRef.current = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", clearInput);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", clearInput);
        };
    }, []);

    useEffect(() => {
        if (mode === PrefabEditorMode.Play) {
            return;
        }

        characterRef.current = null;
        characterFilterRef.current = null;
        planarVelocityRef.current.set(0, 0, 0);
        footstepTimerRef.current = 0;
        jumpQueuedRef.current = false;
        pressedKeysRef.current.clear();
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

        const runtime = runtimeRef.current;
        const world = runtime?.world;
        const baseQueryFilter = runtime?.queryFilter;
        const playerGroup = playerGroupRef.current;
        if (!world || !baseQueryFilter || !playerGroup) {
            return;
        }

        if (!characterRef.current) {
            planarVelocityRef.current.set(0, 0, 0);
            footstepTimerRef.current = 0;
            jumpQueuedRef.current = false;
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

        const pressedKeys = pressedKeysRef.current;
        const forwardInput = Number(hasPressedKey(pressedKeys, forwardKeys)) - Number(hasPressedKey(pressedKeys, backwardKeys));
        const rightInput = Number(hasPressedKey(pressedKeys, rightKeys)) - Number(hasPressedKey(pressedKeys, leftKeys));

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
    });

    if (mode !== PrefabEditorMode.Play) {
        return null;
    }

    return (
        <group ref={playerGroupRef} position={spawnPosition}>
            <PerspectiveCamera makeDefault position={[0, cameraHeight, 0]} fov={90} near={0.1} far={1000} />
            <PointerLockControls makeDefault />
        </group>
    );
});

export default FirstPersonPlayer;
