"use client";

import { useMemo, useRef } from "react";
import { FieldRenderer, useAssetRuntime, useEntityRuntime, usePhysicsEvent } from "react-three-game";
import type { Component, FieldDefinition, PhysicsEventPayload } from "react-three-game";
import { useFrame } from "@react-three/fiber";

const SENSOR_ENTER_EVENT_NAME = "sensor:enter";
const DEFAULT_TRIGGER_ENTITY_ID = "player";
const DEFAULT_TRAVEL_DISTANCE = 4;
const DEFAULT_MOVE_SPEED = 1.6;

type ElevatorMoverProperties = {
    platformNodeId?: string;
    sensorNodeId?: string;
    rigidBodyNodeIds?: string;
    triggerEntityId?: string;
    travelDistance?: number;
    moveSpeed?: number;
};

const elevatorMoverFields: FieldDefinition[] = [
    {
        name: "platformNodeId",
        type: "node",
        label: "Platform Node",
    },
    {
        name: "sensorNodeId",
        type: "node",
        label: "Sensor Node",
    },
    {
        name: "triggerEntityId",
        type: "string",
        label: "Trigger Entity ID",
        placeholder: DEFAULT_TRIGGER_ENTITY_ID,
    },
    { name: "travelDistance", type: "number", label: "Travel Distance", step: 0.1 },
    { name: "moveSpeed", type: "number", label: "Move Speed", min: 0.01, step: 0.1 },
];

function ElevatorMoverEditor({ component, onUpdate }: { component: any; onUpdate: (newComp: any) => void }) {
    return <FieldRenderer fields={elevatorMoverFields} values={component.properties} onChange={onUpdate} />;
}

function ElevatorMoverView({ properties, children }: { properties: ElevatorMoverProperties; children?: React.ReactNode }) {
    const { editMode, nodeId } = useEntityRuntime();
    const assetRuntime = useAssetRuntime();
    const activeRef = useRef(false);
    const startHeightsRef = useRef<Record<string, number>>({});

    const platformNodeId = useMemo(() => {
        if (properties.platformNodeId) {
            return properties.platformNodeId;
        }

        const legacyNodeId = properties.rigidBodyNodeIds
            ?.split(/[\s,]+/)
            .map((entry) => entry.trim())
            .find(Boolean);

        return legacyNodeId ?? nodeId;
    }, [nodeId, properties.platformNodeId, properties.rigidBodyNodeIds]);

    const sensorNodeId = properties.sensorNodeId;
    const triggerEntityId = properties.triggerEntityId ?? DEFAULT_TRIGGER_ENTITY_ID;
    const travelDistance = properties.travelDistance ?? DEFAULT_TRAVEL_DISTANCE;
    const moveSpeed = properties.moveSpeed ?? DEFAULT_MOVE_SPEED;

    usePhysicsEvent(SENSOR_ENTER_EVENT_NAME, (payload: PhysicsEventPayload) => {
        if (editMode) {
            return;
        }

        if (sensorNodeId && payload.sourceEntityId !== sensorNodeId) {
            return;
        }
        if (triggerEntityId && payload.targetEntityId !== triggerEntityId) {
            return;
        }

        activeRef.current = true;
    }, [editMode, sensorNodeId, triggerEntityId]);

    useFrame((_, delta) => {
        if (editMode || !activeRef.current) {
            return;
        }

        const rigidBody = assetRuntime.getRigidBody(platformNodeId);
        if (!rigidBody || typeof rigidBody.translation !== "function" || typeof rigidBody.setTranslation !== "function") {
            activeRef.current = false;
            return;
        }

        const translation = rigidBody.translation();
        const currentY = translation.y;

        if (startHeightsRef.current[platformNodeId] === undefined) {
            startHeightsRef.current[platformNodeId] = currentY;
        }

        const startY = startHeightsRef.current[platformNodeId];
        const targetY = startY + travelDistance;

        if (currentY >= targetY) {
            rigidBody.setTranslation({ x: translation.x, y: targetY, z: translation.z }, true);
            if (typeof rigidBody.setLinvel === "function") {
                rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }
            activeRef.current = false;
            return;
        }

        const nextY = Math.min(currentY + moveSpeed * delta, targetY);

        rigidBody.setTranslation({ x: translation.x, y: nextY, z: translation.z }, true);
    });

    return <>{children}</>;
}

const ElevatorMover: Component = {
    name: "ElevatorMover",
    Editor: ElevatorMoverEditor,
    View: ElevatorMoverView,
    defaultProperties: {
        platformNodeId: "",
        sensorNodeId: "",
        triggerEntityId: DEFAULT_TRIGGER_ENTITY_ID,
        travelDistance: DEFAULT_TRAVEL_DISTANCE,
        moveSpeed: DEFAULT_MOVE_SPEED,
    },
};

export default ElevatorMover;