"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { FieldRenderer, useNode, useScene, useGameEvent } from "react-three-game";
import type { Component, ComponentViewProps, ContactEventPayload, FieldDefinition } from "react-three-game";

const DEFAULT_SPEED = 1.2;
const COLLISION_EVENT_NAME = "orb:collision";

type OrbMoverProperties = {
    speed?: number;
    velocityX?: number;
    velocityZ?: number;
};

type OrbCollisionPayload = ContactEventPayload & {
    collisionNormal?: [number, number, number];
};

type OrbVelocity = {
    x: number;
    z: number;
};

const orbMoverFields: FieldDefinition[] = [
    { name: "speed", type: "number", label: "Speed", min: 0, step: 0.1 },
    { name: "velocityX", type: "number", label: "Velocity X", step: 0.1 },
    { name: "velocityZ", type: "number", label: "Velocity Z", step: 0.1 },
];

function normalizeVelocity(x = 0, z = 0): OrbVelocity {
    const magnitude = Math.hypot(x, z);

    if (magnitude <= Number.EPSILON) {
        return { x: 1, z: 0 };
    }

    return {
        x: x / magnitude,
        z: z / magnitude,
    };
}

function OrbMoverEditor({ component, onUpdate }: { component: { properties: OrbMoverProperties }; onUpdate: (newComp: { properties: OrbMoverProperties }) => void }) {
    return (
        <FieldRenderer
            fields={orbMoverFields}
            values={component.properties}
            onChange={(values) => onUpdate({
                ...component,
                properties: values as OrbMoverProperties,
            })}
        />
    );
}

function isOrbCollisionPayload(value: unknown): value is OrbCollisionPayload {
    return value != null && typeof value === "object" && "sourceNodeId" in value;
}

function OrbMoverView({ properties, children }: ComponentViewProps<OrbMoverProperties>) {
    const { editMode, nodeId } = useNode();
    const scene = useScene();
    const velocityRef = useRef<OrbVelocity>(normalizeVelocity(properties.velocityX ?? 1, properties.velocityZ ?? 0));

    const speed = properties.speed ?? DEFAULT_SPEED;

    useEffect(() => {
        velocityRef.current = normalizeVelocity(properties.velocityX ?? 1, properties.velocityZ ?? 0);
    }, [properties.velocityX, properties.velocityZ]);

    useGameEvent(COLLISION_EVENT_NAME, (payload) => {
        if (editMode || !isOrbCollisionPayload(payload) || payload.sourceNodeId !== nodeId) {
            return;
        }

        const normal = payload.collisionNormal;
        if (!normal) {
            return;
        }

        const normalX = normal[0];
        const normalZ = normal[2];
        const normalMagnitude = Math.hypot(normalX, normalZ);
        if (normalMagnitude <= Number.EPSILON) {
            return;
        }

        const normalizedX = normalX / normalMagnitude;
        const normalizedZ = normalZ / normalMagnitude;
        const dot = velocityRef.current.x * normalizedX + velocityRef.current.z * normalizedZ;

        if (dot <= 0) {
            return;
        }

        const reflectedX = velocityRef.current.x - 2 * dot * normalizedX;
        const reflectedZ = velocityRef.current.z - 2 * dot * normalizedZ;

        velocityRef.current = normalizeVelocity(reflectedX, reflectedZ);
    }, [editMode, nodeId]);

    useFrame((_, delta) => {
        if (editMode) {
            return;
        }

        const orb = scene.getObject(nodeId);
        if (!orb) {
            return;
        }

        const nextX = orb.position.x + velocityRef.current.x * speed * delta;
        const nextZ = orb.position.z + velocityRef.current.z * speed * delta;

        orb.position.set(nextX, orb.position.y, nextZ);
        orb.updateMatrixWorld(true);
    });

    return <>{children}</>;
}

const OrbMover: Component = {
    name: "OrbMover",
    Editor: OrbMoverEditor,
    View: OrbMoverView,
    defaultProperties: {
        speed: DEFAULT_SPEED,
        velocityX: 1,
        velocityZ: 0,
    },
};

export default OrbMover;