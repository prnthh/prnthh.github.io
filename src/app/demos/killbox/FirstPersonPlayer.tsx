"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { capsule, filter, kcc, type Filter } from "crashcat";
import { useEffect, useRef } from "react";
import { FieldRenderer, gameEvents, PrefabEditorMode, useCurrentNode, useEditorContext, type PrefabEditorRef } from "react-three-game";
import type { Component, FieldDefinition } from "react-three-game";
import type { CrashcatRuntimeRef } from "@/app/components/CrashcatRuntime";
import { Vector3 } from "three";

const DEFAULT_MAX_SPEED = 7;
const DEFAULT_GROUND_ACCEL = 18;
const DEFAULT_AIR_ACCEL = 6;
const DEFAULT_FRICTION = 10;
const DEFAULT_JUMP_SPEED = 6.5;
const DEFAULT_FOOTSTEP_EVENT = "player:footstep";
const DEFAULT_FOOTSTEP_MIN_INTERVAL = 0.28;
const DEFAULT_FOOTSTEP_MAX_INTERVAL = 0.48;
const DEFAULT_FOOTSTEP_MIN_SPEED = 1.5;
const DEFAULT_RADIUS = 0.35;
const DEFAULT_HALF_HEIGHT = 0.45;
const GRAVITY: [number, number, number] = [0, -9.81, 0];

const forwardKeys = new Set(["KeyW", "ArrowUp"]);
const backwardKeys = new Set(["KeyS", "ArrowDown"]);
const leftKeys = new Set(["KeyA", "ArrowLeft"]);
const rightKeys = new Set(["KeyD", "ArrowRight"]);

const forwardVector = new Vector3();
const rightVector = new Vector3();
const wishVector = new Vector3();
const worldUp = new Vector3(0, 1, 0);
const worldPosition = new Vector3();
const localPosition = new Vector3();

export type FirstPersonPlayerProperties = {
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
};

const firstPersonPlayerFields: FieldDefinition[] = [
    { name: "radius", type: "number", label: "Radius", min: 0.05, step: 0.01 },
    { name: "halfHeightOfCylinder", type: "number", label: "Half Height", min: 0.05, step: 0.01 },
    { name: "maxSpeed", type: "number", label: "Max Speed", min: 0.1, step: 0.1 },
    { name: "groundAccel", type: "number", label: "Ground Accel", min: 0.1, step: 0.1 },
    { name: "airAccel", type: "number", label: "Air Accel", min: 0.1, step: 0.1 },
    { name: "friction", type: "number", label: "Friction", min: 0, step: 0.1 },
    { name: "jumpSpeed", type: "number", label: "Jump Speed", min: 0, step: 0.1 },
    { name: "footstepEventName", type: "string", label: "Footstep Event", placeholder: DEFAULT_FOOTSTEP_EVENT },
    { name: "footstepMinInterval", type: "number", label: "Step Min Interval", min: 0.05, step: 0.01 },
    { name: "footstepMaxInterval", type: "number", label: "Step Max Interval", min: 0.05, step: 0.01 },
    { name: "footstepMinSpeed", type: "number", label: "Step Min Speed", min: 0, step: 0.1 },
];

function FirstPersonPlayerEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {
    return <FieldRenderer fields={firstPersonPlayerFields} values={component.properties} onChange={onUpdate} />;
}

function FirstPersonPlayerView({ properties, children }: { properties: FirstPersonPlayerProperties; children?: React.ReactNode }) {
    const { editMode } = useCurrentNode();

    return editMode ? <group>{children}</group> : <>{children}</>;
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

function readPlayerSettings(editor: PrefabEditorRef | null, playerId: string): Required<FirstPersonPlayerProperties> {
    const componentMap = (editor?.getNode(playerId) as { components?: Record<string, { type?: string; properties?: FirstPersonPlayerProperties } | undefined> } | null)
        ?.components;

    let properties: FirstPersonPlayerProperties = {};
    if (componentMap) {
        for (const component of Object.values(componentMap)) {
            if (component?.type === "FirstPersonPlayer") {
                properties = component.properties ?? {};
                break;
            }
        }
    }

    return {
        radius: properties.radius ?? DEFAULT_RADIUS,
        halfHeightOfCylinder: properties.halfHeightOfCylinder ?? DEFAULT_HALF_HEIGHT,
        maxSpeed: properties.maxSpeed ?? DEFAULT_MAX_SPEED,
        groundAccel: properties.groundAccel ?? DEFAULT_GROUND_ACCEL,
        airAccel: properties.airAccel ?? DEFAULT_AIR_ACCEL,
        friction: properties.friction ?? DEFAULT_FRICTION,
        jumpSpeed: properties.jumpSpeed ?? DEFAULT_JUMP_SPEED,
        footstepEventName: properties.footstepEventName ?? DEFAULT_FOOTSTEP_EVENT,
        footstepMinInterval: properties.footstepMinInterval ?? DEFAULT_FOOTSTEP_MIN_INTERVAL,
        footstepMaxInterval: properties.footstepMaxInterval ?? DEFAULT_FOOTSTEP_MAX_INTERVAL,
        footstepMinSpeed: properties.footstepMinSpeed ?? DEFAULT_FOOTSTEP_MIN_SPEED,
    };
}

export function KillboxFirstPersonController({
    editorRef,
    runtimeRef,
    playerId = "player",
}: {
    editorRef: React.RefObject<PrefabEditorRef | null>;
    runtimeRef: React.RefObject<CrashcatRuntimeRef | null>;
    playerId?: string;
}) {
    const { mode } = useEditorContext();
    const planarVelocityRef = useRef(new Vector3());
    const footstepTimerRef = useRef(0);
    const characterRef = useRef<ReturnType<typeof kcc.create> | null>(null);
    const updateSettingsRef = useRef(kcc.createDefaultUpdateSettings());
    const pressedKeysRef = useRef(new Set<string>());
    const jumpQueuedRef = useRef(false);
    const characterFilterRef = useRef<Filter | null>(null);
    const { camera } = useThree();

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

    useFrame((_, delta) => {
        if (mode !== PrefabEditorMode.Play) return;

        const editor = editorRef.current;
        const runtime = runtimeRef.current;
        const world = runtime?.world;
        const baseQueryFilter = runtime?.queryFilter;
        if (!editor || !world || !baseQueryFilter) return;

        const playerObject = editor.getNodeObject(playerId);
        if (!playerObject) return;

        const settings = readPlayerSettings(editor, playerId);
        playerObject.getWorldPosition(worldPosition);

        if (!characterRef.current) {
            planarVelocityRef.current.set(0, 0, 0);
            footstepTimerRef.current = 0;
            jumpQueuedRef.current = false;
            characterRef.current = kcc.create({
                shape: capsule.create({
                    radius: settings.radius,
                    halfHeightOfCylinder: settings.halfHeightOfCylinder,
                }),
                maxSlopeAngle: Math.PI / 3,
                characterPadding: 0.02,
            }, [worldPosition.x, worldPosition.y, worldPosition.z], [0, 0, 0, 1]);
        }

        if (!characterFilterRef.current) {
            characterFilterRef.current = filter.forWorld(world);
        }

        const character = characterRef.current;
        const characterFilter = characterFilterRef.current;
        filter.copy(characterFilter, baseQueryFilter);
        const playerBody = runtime.getBody(playerId);
        characterFilter.bodyFilter = playerBody ? (body) => body !== playerBody : undefined;

        const pressedKeys = pressedKeysRef.current;
        const forwardInput = Number(hasPressedKey(pressedKeys, forwardKeys)) - Number(hasPressedKey(pressedKeys, backwardKeys));
        const rightInput = Number(hasPressedKey(pressedKeys, rightKeys)) - Number(hasPressedKey(pressedKeys, leftKeys));

        camera.getWorldDirection(forwardVector);
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
            ? wishVector.normalize().multiplyScalar(settings.maxSpeed)
            : wishVector.set(0, 0, 0);

        const accel = grounded ? settings.groundAccel : settings.airAccel;
        const maxDelta = accel * delta;
        planarVelocity.set(
            moveToward(planarVelocity.x, desiredPlanarSpeed.x, maxDelta),
            0,
            moveToward(planarVelocity.z, desiredPlanarSpeed.z, maxDelta),
        );

        if (grounded && planarVelocity.lengthSq() > 0 && desiredPlanarSpeed.lengthSq() === 0) {
            const damping = Math.max(0, 1 - settings.friction * delta * 0.1);
            planarVelocity.multiplyScalar(damping);
        }

        if (grounded && jumpQueuedRef.current) {
            character.linearVelocity[1] = settings.jumpSpeed;
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
        const moving = grounded && desiredPlanarSpeed.lengthSq() > 0 && speed > settings.footstepMinSpeed;

        if (!moving) {
            footstepTimerRef.current = 0;
        } else {
            footstepTimerRef.current -= delta;

            if (footstepTimerRef.current <= 0) {
                gameEvents.emit(settings.footstepEventName, {
                    nodeId: "player-footsteps",
                    sourceEntityId: playerId,
                    sourceNodeId: playerId,
                    speed,
                });

                const speedAlpha = Math.min(speed / settings.maxSpeed, 1);
                footstepTimerRef.current = settings.footstepMaxInterval - (settings.footstepMaxInterval - settings.footstepMinInterval) * speedAlpha;
            }
        }

        worldPosition.set(character.position[0], character.position[1], character.position[2]);
        if (playerObject.parent) {
            localPosition.copy(worldPosition);
            playerObject.parent.worldToLocal(localPosition);
            playerObject.position.copy(localPosition);
        } else {
            playerObject.position.copy(worldPosition);
        }
        playerObject.updateMatrixWorld(true);
    });

    return mode === PrefabEditorMode.Play ? <PointerLockControls makeDefault /> : null;
}

const FirstPersonPlayer: Component = {
    name: "FirstPersonPlayer",
    Editor: FirstPersonPlayerEditor,
    View: FirstPersonPlayerView,
    defaultProperties: {
        radius: DEFAULT_RADIUS,
        halfHeightOfCylinder: DEFAULT_HALF_HEIGHT,
        maxSpeed: DEFAULT_MAX_SPEED,
        groundAccel: DEFAULT_GROUND_ACCEL,
        airAccel: DEFAULT_AIR_ACCEL,
        friction: DEFAULT_FRICTION,
        jumpSpeed: DEFAULT_JUMP_SPEED,
        footstepEventName: DEFAULT_FOOTSTEP_EVENT,
        footstepMinInterval: DEFAULT_FOOTSTEP_MIN_INTERVAL,
        footstepMaxInterval: DEFAULT_FOOTSTEP_MAX_INTERVAL,
        footstepMinSpeed: DEFAULT_FOOTSTEP_MIN_SPEED,
    },
};

export default FirstPersonPlayer;
