"use client";

import { useEffect, useMemo } from "react";
import {
    BooleanField,
    FieldRenderer,
    StringField,
    Vector3Field,
    useAssetRuntime,
    useNode,
    type Component,
    type ComponentViewProps,
    type FieldDefinition,
} from "react-three-game";
import {
    box,
    capsule,
    convexHull,
    MotionQuality,
    MotionType,
    rigidBody,
    sphere,
    triangleMesh,
} from "crashcat";
import { Matrix4, Quaternion, Vector3 } from "three";
import type { Object3D } from "three";
import { useCrashcat, type CrashcatApi } from "./CrashcatRuntime";

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

type CrashcatPhysicsEditorProps = {
    component: { properties: CrashcatPhysicsProperties };
    onUpdate: (values: CrashcatPhysicsProperties) => void;
};

function CrashcatPhysicsEditor({ component, onUpdate }: CrashcatPhysicsEditorProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <FieldRenderer fields={crashcatPhysicsFields} values={component.properties} onChange={onUpdate} />
            <BooleanField name="sensor" label="Sensor" values={component.properties} onChange={onUpdate} fallback={false} />
            <Vector3Field name="linearVelocity" label="Linear Velocity" values={component.properties} onChange={onUpdate} fallback={[0, 0, 0]} />
            <Vector3Field name="angularVelocity" label="Angular Velocity" values={component.properties} onChange={onUpdate} fallback={[0, 0, 0]} />
            <StringField name="collisionEnterEventName" label="Collision Enter" values={component.properties} onChange={onUpdate} fallback="" />
            <StringField name="collisionExitEventName" label="Collision Exit" values={component.properties} onChange={onUpdate} fallback="" />
            <StringField name="sensorEnterEventName" label="Sensor Enter" values={component.properties} onChange={onUpdate} fallback="" />
            <StringField name="sensorExitEventName" label="Sensor Exit" values={component.properties} onChange={onUpdate} fallback="" />
        </div>
    );
}

const inverseWorldMatrix = new Matrix4();
const childToLocalMatrix = new Matrix4();
const scratchVertex = new Vector3();
const scratchScale = new Vector3();
const scratchPosition = new Vector3();
const scratchBoundsSize = new Vector3();

type GeometryData = { positions: number[]; indices: number[] };

function collectGeometryData(object: Object3D): GeometryData | null {
    const positions: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    inverseWorldMatrix.copy(object.matrixWorld).invert();

    object.traverse((child) => {
        const geometry = (child as Object3D & {
            geometry?: {
                attributes?: { position?: { count: number; getX: (i: number) => number; getY: (i: number) => number; getZ: (i: number) => number } };
                index?: { count: number; getX: (i: number) => number } | null;
            };
        }).geometry;
        const positionAttribute = geometry?.attributes?.position;
        if (!positionAttribute) return;

        childToLocalMatrix.multiplyMatrices(inverseWorldMatrix, child.matrixWorld);

        for (let i = 0; i < positionAttribute.count; i += 1) {
            scratchVertex
                .set(positionAttribute.getX(i), positionAttribute.getY(i), positionAttribute.getZ(i))
                .applyMatrix4(childToLocalMatrix);
            positions.push(scratchVertex.x, scratchVertex.y, scratchVertex.z);
        }

        if (geometry.index) {
            for (let i = 0; i < geometry.index.count; i += 1) {
                indices.push(vertexOffset + geometry.index.getX(i));
            }
        } else {
            for (let i = 0; i < positionAttribute.count; i += 1) {
                indices.push(vertexOffset + i);
            }
        }

        vertexOffset += positionAttribute.count;
    });

    if (positions.length === 0 || indices.length < 3) return null;
    return { positions, indices };
}

function createShapeForObject(object: Object3D, physics: CrashcatPhysicsProperties) {
    object.updateWorldMatrix(true, true);

    if (physics.colliders === "trimesh") {
        const geometry = collectGeometryData(object);
        return geometry ? triangleMesh.create(geometry) : null;
    }

    if (physics.colliders === "hull") {
        const geometry = collectGeometryData(object);
        return geometry ? convexHull.create({ positions: geometry.positions }) : null;
    }

    if (physics.colliders === "capsule") {
        return capsule.create({
            radius: Math.max(physics.capsuleRadius ?? 0.35, 0.01),
            halfHeightOfCylinder: Math.max(physics.capsuleHalfHeight ?? 0.45, 0.01),
        });
    }

    object.getWorldScale(scratchScale);
    const geometry = collectGeometryData(object);
    if (!geometry) return null;

    if (physics.colliders === "ball") {
        let maxRadiusSq = 0;
        for (let i = 0; i < geometry.positions.length; i += 3) {
            const x = geometry.positions[i] * scratchScale.x;
            const y = geometry.positions[i + 1] * scratchScale.y;
            const z = geometry.positions[i + 2] * scratchScale.z;
            maxRadiusSq = Math.max(maxRadiusSq, x * x + y * y + z * z);
        }
        return sphere.create({ radius: Math.max(Math.sqrt(maxRadiusSq), 0.01) });
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < geometry.positions.length; i += 3) {
        const x = geometry.positions[i] * scratchScale.x;
        const y = geometry.positions[i + 1] * scratchScale.y;
        const z = geometry.positions[i + 2] * scratchScale.z;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    scratchBoundsSize.set(maxX - minX, maxY - minY, maxZ - minZ);

    return box.create({
        halfExtents: [
            Math.max(scratchBoundsSize.x * 0.5, 0.01),
            Math.max(scratchBoundsSize.y * 0.5, 0.01),
            Math.max(scratchBoundsSize.z * 0.5, 0.01),
        ],
    });
}

function toMotionType(physics: CrashcatPhysicsProperties): MotionType {
    if (physics.type === "dynamic") return MotionType.DYNAMIC;
    if (physics.type === "kinematicPosition" || physics.type === "kinematicVelocity") return MotionType.KINEMATIC;
    return MotionType.STATIC;
}

function toMotionQuality(physics: CrashcatPhysicsProperties) {
    return physics.type === "kinematicPosition" ? MotionQuality.LINEAR_CAST : undefined;
}

function CrashcatPhysicsView({ properties, children }: ComponentViewProps<CrashcatPhysicsProperties>) {
    const { nodeId, getObject } = useNode();
    const api: CrashcatApi | null = useCrashcat();
    const { getAssetRevision } = useAssetRuntime();
    const revision = getAssetRevision();
    const {
        angularVelocity,
        capsuleHalfHeight,
        capsuleRadius,
        colliders,
        collisionEnterEventName,
        collisionExitEventName,
        friction,
        linearVelocity,
        restitution,
        sensor,
        sensorEnterEventName,
        sensorExitEventName,
        type,
    } = properties;
    const physics = useMemo<CrashcatPhysicsProperties>(() => ({
        angularVelocity,
        capsuleHalfHeight,
        capsuleRadius,
        colliders,
        collisionEnterEventName,
        collisionExitEventName,
        friction,
        linearVelocity,
        restitution,
        sensor,
        sensorEnterEventName,
        sensorExitEventName,
        type,
    }), [
        angularVelocity?.[0],
        angularVelocity?.[1],
        angularVelocity?.[2],
        capsuleHalfHeight,
        capsuleRadius,
        colliders,
        collisionEnterEventName,
        collisionExitEventName,
        friction,
        linearVelocity?.[0],
        linearVelocity?.[1],
        linearVelocity?.[2],
        restitution,
        sensor,
        sensorEnterEventName,
        sensorExitEventName,
        type,
    ]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        // Rebuild mesh-derived colliders when referenced assets finish loading.
        void revision;
        if (!api) return;
        const object = getObject();
        if (!object) return;

        const shape = createShapeForObject(object, physics);
        if (!shape) return;

        object.updateWorldMatrix(true, true);
        object.getWorldPosition(scratchPosition);
        const wq = new Quaternion();
        object.getWorldQuaternion(wq);

        const motionType = toMotionType(physics);
        const motionQuality = toMotionQuality(physics);
        const isKinematic = motionType === MotionType.KINEMATIC;
        const isStatic = motionType === MotionType.STATIC;

        const body = rigidBody.create(api.world, {
            shape,
            motionType,
            motionQuality,
            objectLayer: isStatic ? api.staticObjectLayer : api.movingObjectLayer,
            position: [scratchPosition.x, scratchPosition.y, scratchPosition.z],
            quaternion: [wq.x, wq.y, wq.z, wq.w],
            sensor: Boolean(physics.sensor),
            collideKinematicVsNonDynamic: isKinematic,
            friction: physics.friction,
            restitution: physics.restitution,
            userData: { nodeId },
        });

        if (physics.linearVelocity) {
            rigidBody.setLinearVelocity(api.world, body, physics.linearVelocity);
        }
        if (physics.angularVelocity) {
            rigidBody.setAngularVelocity(api.world, body, physics.angularVelocity);
        }

        api.register(nodeId, body, object, {
            motionType,
            sensor: Boolean(physics.sensor),
            events: {
                collisionEnter: physics.collisionEnterEventName,
                collisionExit: physics.collisionExitEventName,
                sensorEnter: physics.sensorEnterEventName,
                sensorExit: physics.sensorExitEventName,
            },
        });

        return () => {
            api.unregister(nodeId);
        };
    }, [
        api,
        getObject,
        nodeId,
        physics,
        revision,
    ]);

    return <>{children}</>;
}

const CrashcatPhysicsComponent: Component = {
    name: "CrashcatPhysics",
    Editor: CrashcatPhysicsEditor,
    View: CrashcatPhysicsView,
    defaultProperties: {
        type: "fixed",
        colliders: "cuboid",
        sensor: false,
    },
};

export default CrashcatPhysicsComponent;
