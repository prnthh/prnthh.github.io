"use client";

import { BooleanField, Component, FieldRenderer, StringField, Vector3Field } from "react-three-game";
import type { FieldDefinition } from "react-three-game";

type CrashcatPhysicsProperties = {
    type?: "fixed" | "dynamic" | "kinematicPosition" | "kinematicVelocity";
    colliders?: "cuboid" | "ball" | "capsule" | "hull" | "trimesh";
    sensor?: boolean;
    friction?: number;
    restitution?: number;
    capsuleRadius?: number;
    capsuleHalfHeight?: number;
    linearVelocity?: [number, number, number];
    angularVelocity?: [number, number, number];
    collisionEnterEventName?: string;
    collisionExitEventName?: string;
    sensorEnterEventName?: string;
    sensorExitEventName?: string;
};

const crashcatPhysicsFields: FieldDefinition[] = [
    {
        name: "type",
        type: "select",
        label: "Motion Type",
        options: [
            { value: "fixed", label: "Fixed" },
            { value: "dynamic", label: "Dynamic" },
            { value: "kinematicPosition", label: "Kinematic Position" },
            { value: "kinematicVelocity", label: "Kinematic Velocity" },
        ],
    },
    {
        name: "colliders",
        type: "select",
        label: "Collider",
        options: [
            { value: "cuboid", label: "Cuboid" },
            { value: "ball", label: "Ball" },
            { value: "capsule", label: "Capsule" },
            { value: "hull", label: "Hull" },
            { value: "trimesh", label: "Tri Mesh" },
        ],
    },
    { name: "friction", type: "number", label: "Friction", step: 0.05 },
    { name: "restitution", type: "number", label: "Restitution", step: 0.05 },
    { name: "capsuleRadius", type: "number", label: "Capsule Radius", step: 0.05 },
    { name: "capsuleHalfHeight", type: "number", label: "Capsule Half Height", step: 0.05 },
];

function CrashcatPhysicsEditor({ component, onUpdate }: { component: { properties: CrashcatPhysicsProperties }; onUpdate: (newComp: { properties: CrashcatPhysicsProperties }) => void }) {
    const handleFieldChange = (values: Record<string, any>) => {
        onUpdate({
            ...component,
            properties: values as CrashcatPhysicsProperties,
        });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <FieldRenderer fields={crashcatPhysicsFields} values={component.properties} onChange={handleFieldChange} />
            <BooleanField name="sensor" label="Sensor" values={component.properties} onChange={handleFieldChange} fallback={false} />
            <Vector3Field name="linearVelocity" label="Linear Velocity" values={component.properties} onChange={handleFieldChange} fallback={[0, 0, 0]} />
            <Vector3Field name="angularVelocity" label="Angular Velocity" values={component.properties} onChange={handleFieldChange} fallback={[0, 0, 0]} />
            <StringField name="collisionEnterEventName" label="Collision Enter" values={component.properties} onChange={handleFieldChange} fallback="" />
            <StringField name="collisionExitEventName" label="Collision Exit" values={component.properties} onChange={handleFieldChange} fallback="" />
            <StringField name="sensorEnterEventName" label="Sensor Enter" values={component.properties} onChange={handleFieldChange} fallback="" />
            <StringField name="sensorExitEventName" label="Sensor Exit" values={component.properties} onChange={handleFieldChange} fallback="" />
        </div>
    );
}

const CrashcatPhysicsComponent: Component = {
    name: "CrashcatPhysics",
    Editor: CrashcatPhysicsEditor,
    defaultProperties: {
        type: "fixed",
        colliders: "cuboid",
        sensor: false,
    },
};

export default CrashcatPhysicsComponent;