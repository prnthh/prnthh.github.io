"use client";

import { useMemo, useRef } from "react";
import { FieldRenderer, useNode, useScene, useGameEvent } from "react-three-game";
import type { Component, ComponentViewProps, ContactEventPayload, FieldDefinition } from "react-three-game";
import { useFrame } from "@react-three/fiber";

const SENSOR_ENTER_EVENT_NAME = "sensor:enter";
const DEFAULT_TRAVEL_DISTANCE = 4;
const DEFAULT_MOVE_SPEED = 1.6;
const DEFAULT_RETURN_DELAY = 1;
const DEFAULT_RETURN_DURATION = 2.5;

type ElevatorPhase = "idle" | "ascending" | "waiting" | "descending";

type ElevatorMoverProperties = {
    platformNodeId?: string;
    sensorNodeId?: string;
    rigidBodyNodeIds?: string;
    travelDistance?: number;
    moveSpeed?: number;
    returnDelay?: number;
    returnDuration?: number;
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
    { name: "travelDistance", type: "number", label: "Travel Distance", step: 0.1 },
    { name: "moveSpeed", type: "number", label: "Move Speed", min: 0.01, step: 0.1 },
    { name: "returnDelay", type: "number", label: "Return Delay", min: 0, step: 0.1 },
    { name: "returnDuration", type: "number", label: "Return Duration", min: 0.01, step: 0.1 },
];

type ElevatorMoverEditorProps = {
    component: { properties: ElevatorMoverProperties };
    onUpdate: (values: ElevatorMoverProperties) => void;
};

function ElevatorMoverEditor({ component, onUpdate }: ElevatorMoverEditorProps) {
    return <FieldRenderer fields={elevatorMoverFields} values={component.properties} onChange={onUpdate} />;
}

function ElevatorMoverView({ properties, children }: ComponentViewProps<ElevatorMoverProperties>) {
    const { editMode, nodeId } = useNode();
    const scene = useScene();
    const phaseRef = useRef<ElevatorPhase>("idle");
    const waitTimerRef = useRef(0);
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
    const travelDistance = properties.travelDistance ?? DEFAULT_TRAVEL_DISTANCE;
    const moveSpeed = properties.moveSpeed ?? DEFAULT_MOVE_SPEED;
    const returnDelay = properties.returnDelay ?? DEFAULT_RETURN_DELAY;
    const returnDuration = properties.returnDuration ?? DEFAULT_RETURN_DURATION;

    useGameEvent(SENSOR_ENTER_EVENT_NAME, (payload: ContactEventPayload) => {
        if (editMode || !payload) {
            return;
        }

        if (sensorNodeId && payload.sourceNodeId !== sensorNodeId) {
            return;
        }

        if (phaseRef.current === "idle" || phaseRef.current === "descending") {
            phaseRef.current = "ascending";
            waitTimerRef.current = 0;
        }
    }, [editMode, sensorNodeId]);

    useFrame((_, delta) => {
        if (editMode || phaseRef.current === "idle") {
            return;
        }

        const platformObject = scene.getObject(platformNodeId);
        if (!platformObject) {
            phaseRef.current = "idle";
            waitTimerRef.current = 0;
            return;
        }

        const currentY = platformObject.position.y;

        if (startHeightsRef.current[platformNodeId] === undefined) {
            startHeightsRef.current[platformNodeId] = currentY;
        }

        const startY = startHeightsRef.current[platformNodeId];
        const targetY = startY + travelDistance;
        const returnSpeed = travelDistance / Math.max(returnDuration, 0.01);

        if (phaseRef.current === "waiting") {
            waitTimerRef.current -= delta;
            if (waitTimerRef.current <= 0) {
                phaseRef.current = "descending";
            }
            return;
        }

        if (phaseRef.current === "ascending") {
            if (currentY >= targetY) {
                platformObject.position.y = targetY;
                platformObject.updateMatrixWorld(true);
                phaseRef.current = "waiting";
                waitTimerRef.current = returnDelay;
                return;
            }

            const nextY = Math.min(currentY + moveSpeed * delta, targetY);

            platformObject.position.y = nextY;
            platformObject.updateMatrixWorld(true);
            return;
        }

        const nextY = Math.max(currentY - returnSpeed * delta, startY);

        platformObject.position.y = nextY;
        platformObject.updateMatrixWorld(true);

        if (nextY <= startY) {
            phaseRef.current = "idle";
            waitTimerRef.current = 0;
        }
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
        travelDistance: DEFAULT_TRAVEL_DISTANCE,
        moveSpeed: DEFAULT_MOVE_SPEED,
        returnDelay: DEFAULT_RETURN_DELAY,
        returnDuration: DEFAULT_RETURN_DURATION,
    },
};

export default ElevatorMover;