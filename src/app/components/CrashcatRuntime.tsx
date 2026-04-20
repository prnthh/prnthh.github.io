"use client";

import { useFrame } from "@react-three/fiber";
import {
    addBroadphaseLayer,
    addObjectLayer,
    box,
    capsule,
    convexHull,
    createWorld,
    createWorldSettings,
    enableCollision,
    filter,
    MotionQuality,
    MotionType,
    registerAll,
    rigidBody,
    sphere,
    triangleMesh,
    type Filter,
    type Listener,
    type RigidBody,
    type World,
    updateWorld,
} from "crashcat";
import { debugRenderer } from "crashcat/three";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type RefObject } from "react";
import { gameEvents, PrefabEditorMode, useEditorContext, type PrefabEditorRef } from "react-three-game";
import { Matrix4, Object3D, Quaternion, Vector3 } from "three";

const inverseWorldMatrix = new Matrix4();
const childToLocalMatrix = new Matrix4();
const worldQuaternion = new Quaternion();
const localQuaternion = new Quaternion();
const parentWorldQuaternion = new Quaternion();
const scratchPosition = new Vector3();
const scratchVertex = new Vector3();
const scratchScale = new Vector3();
const scratchBoundsSize = new Vector3();

let didRegisterCrashcat = false;

function ensureCrashcatRegistered() {
    if (didRegisterCrashcat) {
        return;
    }

    registerAll();
    didRegisterCrashcat = true;
}

type PhysicsProperties = {
    type?: string;
    colliders?: string;
    sensor?: boolean;
    friction?: number;
    restitution?: number;
    linearVelocity?: [number, number, number];
    angularVelocity?: [number, number, number];
    capsuleRadius?: number;
    capsuleHalfHeight?: number;
    emitCollisionEnterEvent?: boolean;
    collisionEnterEventName?: string;
    emitCollisionExitEvent?: boolean;
    collisionExitEventName?: string;
    emitSensorEnterEvent?: boolean;
    sensorEnterEventName?: string;
    emitSensorExitEvent?: boolean;
    sensorExitEventName?: string;
};

type BodyEvents = {
    collisionEnter?: string;
    collisionExit?: string;
    sensorEnter?: string;
    sensorExit?: string;
};

type BodyMeta = {
    nodeId: string;
    motionType: MotionType;
    sensor: boolean;
    events: BodyEvents;
};

type GeometryData = {
    positions: number[];
    indices: number[];
};

type PrefabComponentEntry = {
    type?: string;
    properties?: Record<string, unknown>;
};

type PrefabNodeLike = {
    components?: Record<string, PrefabComponentEntry | undefined>;
};

export interface CrashcatRuntimeRef {
    world: World | null;
    queryFilter: Filter | null;
    staticObjectLayer: number;
    movingObjectLayer: number;
    getBody: (nodeId: string) => RigidBody | null;
}

function getPrefabNodeId(object: Object3D | null | undefined) {
    return typeof object?.userData?.prefabNodeId === "string" ? object.userData.prefabNodeId : null;
}

function isPhysicsProperties(value: unknown): value is PhysicsProperties {
    return Boolean(value) && typeof value === "object";
}

function readCrashcatProperties(object: Object3D | null | undefined): PhysicsProperties | null {
    const crashcat = object?.userData?.crashcat;
    return isPhysicsProperties(crashcat) ? crashcat : null;
}

function getNodeComponent(node: PrefabNodeLike | null, type: string) {
    if (!node?.components) {
        return null;
    }

    for (const component of Object.values(node.components)) {
        if (component?.type === type) {
            return component;
        }
    }

    return null;
}

function hasComponent(editor: PrefabEditorRef, nodeId: string, type: string) {
    const node = editor.getNode(nodeId) as PrefabNodeLike | null;
    return Boolean(getNodeComponent(node, type));
}

function toMotionType(physics: PhysicsProperties, forceKinematic: boolean) {
    if (forceKinematic) {
        return MotionType.KINEMATIC;
    }

    if (physics.type === "dynamic") {
        return MotionType.DYNAMIC;
    }

    if (physics.type === "kinematicPosition" || physics.type === "kinematicVelocity") {
        return MotionType.KINEMATIC;
    }

    return MotionType.STATIC;
}

function toMotionQuality(physics: PhysicsProperties) {
    return physics.type === "kinematicPosition" ? MotionQuality.LINEAR_CAST : undefined;
}

function toBodyEvents(physics: PhysicsProperties): BodyEvents {
    return {
        collisionEnter: physics.emitCollisionEnterEvent ? physics.collisionEnterEventName : undefined,
        collisionExit: physics.emitCollisionExitEvent ? physics.collisionExitEventName : undefined,
        sensorEnter: physics.emitSensorEnterEvent ? physics.sensorEnterEventName : undefined,
        sensorExit: physics.emitSensorExitEvent ? physics.sensorExitEventName : undefined,
    };
}

function emitEvent(eventName: string | undefined, sourceNodeId: string, targetNodeId: string | null) {
    const trimmed = eventName?.trim();
    if (!trimmed) {
        return;
    }

    gameEvents.emit(trimmed, {
        sourceEntityId: sourceNodeId,
        sourceNodeId,
        targetEntityId: targetNodeId,
        targetNodeId,
    });
}

function collectGeometryData(object: Object3D): GeometryData | null {
    const positions: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    inverseWorldMatrix.copy(object.matrixWorld).invert();

    object.traverse((child) => {
        const geometry = (child as Object3D & {
            geometry?: {
                attributes?: { position?: { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number } };
                index?: { count: number; getX: (index: number) => number } | null;
            };
        }).geometry;
        const positionAttribute = geometry?.attributes?.position;

        if (!positionAttribute) {
            return;
        }

        childToLocalMatrix.multiplyMatrices(inverseWorldMatrix, child.matrixWorld);

        for (let index = 0; index < positionAttribute.count; index += 1) {
            scratchVertex
                .set(positionAttribute.getX(index), positionAttribute.getY(index), positionAttribute.getZ(index))
                .applyMatrix4(childToLocalMatrix);
            positions.push(scratchVertex.x, scratchVertex.y, scratchVertex.z);
        }

        if (geometry.index) {
            for (let index = 0; index < geometry.index.count; index += 1) {
                indices.push(vertexOffset + geometry.index.getX(index));
            }
        } else {
            for (let index = 0; index < positionAttribute.count; index += 1) {
                indices.push(vertexOffset + index);
            }
        }

        vertexOffset += positionAttribute.count;
    });

    if (positions.length === 0 || indices.length < 3) {
        return null;
    }

    return { positions, indices };
}

function createShapeForObject(object: Object3D, physics: PhysicsProperties) {
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
    if (!geometry) {
        return null;
    }

    if (physics.colliders === "ball") {
        let maxRadiusSq = 0;
        for (let index = 0; index < geometry.positions.length; index += 3) {
            const x = geometry.positions[index] * scratchScale.x;
            const y = geometry.positions[index + 1] * scratchScale.y;
            const z = geometry.positions[index + 2] * scratchScale.z;
            maxRadiusSq = Math.max(maxRadiusSq, x * x + y * y + z * z);
        }

        return sphere.create({ radius: Math.max(Math.sqrt(maxRadiusSq), 0.01) });
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < geometry.positions.length; index += 3) {
        const x = geometry.positions[index] * scratchScale.x;
        const y = geometry.positions[index + 1] * scratchScale.y;
        const z = geometry.positions[index + 2] * scratchScale.z;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
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

function setObjectWorldTransform(object: Object3D, position: [number, number, number], quaternion: [number, number, number, number]) {
    if (!object.parent) {
        object.position.set(position[0], position[1], position[2]);
        object.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
        object.updateMatrixWorld(true);
        return;
    }

    scratchPosition.set(position[0], position[1], position[2]);
    object.parent.worldToLocal(scratchPosition);
    object.position.copy(scratchPosition);

    object.parent.getWorldQuaternion(parentWorldQuaternion);
    worldQuaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
    localQuaternion.copy(parentWorldQuaternion).invert().multiply(worldQuaternion);
    object.quaternion.copy(localQuaternion);
    object.updateMatrixWorld(true);
}

export const CrashcatRuntime = forwardRef<CrashcatRuntimeRef, {
    editorRef: RefObject<PrefabEditorRef | null>;
    debug?: boolean;
}>(({ editorRef, debug = false }, ref) => {
    const { mode } = useEditorContext();
    const worldRef = useRef<World | null>(null);
    const queryFilterRef = useRef<Filter | null>(null);
    const staticObjectLayerRef = useRef(-1);
    const movingObjectLayerRef = useRef(-1);
    const bodyIdByNodeIdRef = useRef(new Map<string, number>());
    const bodyMetaByIdRef = useRef(new Map<number, BodyMeta>());
    const debugStateRef = useRef<ReturnType<typeof debugRenderer.init> | null>(null);
    const lastModeRef = useRef(mode);
    const rebuildBodiesRef = useRef(false);

    if (debug && !debugStateRef.current) {
        const options = debugRenderer.createDefaultOptions();
        options.bodies.wireframe = true;
        options.bodies.color = debugRenderer.BodyColorMode.MOTION_TYPE;
        options.bodies.showAngularVelocity = false;
        options.bodies.showLinearVelocity = false;
        options.contacts.enabled = false;
        options.contactConstraints.enabled = false;
        debugStateRef.current = debugRenderer.init(options);
    }

    const listener = useMemo<Listener>(() => ({
        onContactAdded: (bodyA, bodyB) => {
            const metaA = bodyMetaByIdRef.current.get(Number(bodyA.id));
            const metaB = bodyMetaByIdRef.current.get(Number(bodyB.id));

            if (metaA) {
                emitEvent(metaA.sensor ? metaA.events.sensorEnter : metaA.events.collisionEnter, metaA.nodeId, metaB?.nodeId ?? null);
            }
            if (metaB) {
                emitEvent(metaB.sensor ? metaB.events.sensorEnter : metaB.events.collisionEnter, metaB.nodeId, metaA?.nodeId ?? null);
            }
        },
        onContactRemoved: (bodyIdA, bodyIdB) => {
            const metaA = bodyMetaByIdRef.current.get(Number(bodyIdA));
            const metaB = bodyMetaByIdRef.current.get(Number(bodyIdB));

            if (metaA) {
                emitEvent(metaA.sensor ? metaA.events.sensorExit : metaA.events.collisionExit, metaA.nodeId, metaB?.nodeId ?? null);
            }
            if (metaB) {
                emitEvent(metaB.sensor ? metaB.events.sensorExit : metaB.events.collisionExit, metaB.nodeId, metaA?.nodeId ?? null);
            }
        },
    }), []);

    useEffect(() => {
        ensureCrashcatRegistered();

        const settings = createWorldSettings();
        settings.narrowphase.collideWithBackfaces = true;

        const movingBroadphaseLayer = addBroadphaseLayer(settings);
        const staticBroadphaseLayer = addBroadphaseLayer(settings);
        movingObjectLayerRef.current = addObjectLayer(settings, movingBroadphaseLayer);
        staticObjectLayerRef.current = addObjectLayer(settings, staticBroadphaseLayer);
        enableCollision(settings, movingObjectLayerRef.current, staticObjectLayerRef.current);
        enableCollision(settings, movingObjectLayerRef.current, movingObjectLayerRef.current);

        const world = createWorld(settings);
        worldRef.current = world;
        queryFilterRef.current = filter.forWorld(world);
        rebuildBodiesRef.current = true;

        return () => {
            if (debugStateRef.current) {
                debugRenderer.dispose(debugStateRef.current);
                debugStateRef.current = null;
            }

            worldRef.current = null;
            queryFilterRef.current = null;
            bodyIdByNodeIdRef.current.clear();
            bodyMetaByIdRef.current.clear();
        };
    }, [debug]);

    useImperativeHandle(ref, () => ({
        get world() {
            return worldRef.current;
        },
        get queryFilter() {
            return queryFilterRef.current;
        },
        get staticObjectLayer() {
            return staticObjectLayerRef.current;
        },
        get movingObjectLayer() {
            return movingObjectLayerRef.current;
        },
        getBody(nodeId: string) {
            const world = worldRef.current;
            const bodyId = bodyIdByNodeIdRef.current.get(nodeId);

            if (!world || bodyId === undefined) {
                return null;
            }

            return rigidBody.get(world, bodyId) ?? null;
        },
    }), []);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }

        return editor.onSceneChange(() => {
            rebuildBodiesRef.current = true;
        });
    }, [editorRef]);

    useFrame((_, delta) => {
        const editor = editorRef.current;
        const world = worldRef.current;
        const root = editor?.root;
        if (!editor || !world || !root) {
            return;
        }

        if (mode !== lastModeRef.current) {
            rebuildBodiesRef.current = true;
            lastModeRef.current = mode;
        }

        if (rebuildBodiesRef.current) {
            for (const bodyId of bodyIdByNodeIdRef.current.values()) {
                const body = rigidBody.get(world, bodyId);
                if (body) {
                    rigidBody.remove(world, body);
                }
            }

            bodyIdByNodeIdRef.current.clear();
            bodyMetaByIdRef.current.clear();
            rebuildBodiesRef.current = false;
        }

        const seenNodeIds = new Set<string>();

        root.traverse((candidate) => {
            const nodeId = getPrefabNodeId(candidate);
            if (!nodeId || seenNodeIds.has(nodeId)) {
                return;
            }

            seenNodeIds.add(nodeId);

            const object = editor.getNodeObject(nodeId) ?? candidate;
            const physics = readCrashcatProperties(object);
            if (!physics) {
                return;
            }

            const existingBodyId = bodyIdByNodeIdRef.current.get(nodeId);
            if (existingBodyId !== undefined) {
                return;
            }

            const shape = createShapeForObject(object, physics);
            if (!shape) {
                return;
            }

            object.getWorldPosition(scratchPosition);
            object.getWorldQuaternion(worldQuaternion);

            const forceKinematic = hasComponent(editor, nodeId, "FirstPersonPlayer");
            const motionType = toMotionType(physics, forceKinematic);
            const body = rigidBody.create(world, {
                shape,
                motionType,
                motionQuality: toMotionQuality(physics),
                objectLayer: motionType === MotionType.STATIC ? staticObjectLayerRef.current : movingObjectLayerRef.current,
                position: [scratchPosition.x, scratchPosition.y, scratchPosition.z],
                quaternion: [worldQuaternion.x, worldQuaternion.y, worldQuaternion.z, worldQuaternion.w],
                sensor: Boolean(physics.sensor),
                collideKinematicVsNonDynamic: motionType === MotionType.KINEMATIC,
                friction: physics.friction,
                restitution: physics.restitution,
                userData: { nodeId },
            });

            if (physics.linearVelocity) {
                rigidBody.setLinearVelocity(world, body, physics.linearVelocity);
            }
            if (physics.angularVelocity) {
                rigidBody.setAngularVelocity(world, body, physics.angularVelocity);
            }

            bodyIdByNodeIdRef.current.set(nodeId, Number(body.id));
            bodyMetaByIdRef.current.set(Number(body.id), {
                nodeId,
                motionType,
                sensor: Boolean(physics.sensor),
                events: toBodyEvents(physics),
            });
        });

        for (const [nodeId, bodyId] of bodyIdByNodeIdRef.current) {
            if (seenNodeIds.has(nodeId)) {
                continue;
            }

            const body = rigidBody.get(world, bodyId);
            if (body) {
                rigidBody.remove(world, body);
            }
            bodyIdByNodeIdRef.current.delete(nodeId);
            bodyMetaByIdRef.current.delete(bodyId);
        }

        const stepDelta = Math.min(delta, 1 / 30);

        if (mode === PrefabEditorMode.Play) {
            for (const [nodeId, bodyId] of bodyIdByNodeIdRef.current) {
                const body = rigidBody.get(world, bodyId);
                if (!body || body.motionType !== MotionType.KINEMATIC) {
                    continue;
                }

                const object = editor.getNodeObject(nodeId);
                if (!object) {
                    continue;
                }

                object.getWorldPosition(scratchPosition);
                object.getWorldQuaternion(worldQuaternion);
                rigidBody.moveKinematic(
                    body,
                    [scratchPosition.x, scratchPosition.y, scratchPosition.z],
                    [worldQuaternion.x, worldQuaternion.y, worldQuaternion.z, worldQuaternion.w],
                    stepDelta,
                );
            }

            updateWorld(world, listener, stepDelta);

            for (const [nodeId, bodyId] of bodyIdByNodeIdRef.current) {
                const body = rigidBody.get(world, bodyId);
                const meta = bodyMetaByIdRef.current.get(bodyId);
                const object = editor.getNodeObject(nodeId);

                if (!body || !meta || !object || meta.motionType !== MotionType.DYNAMIC) {
                    continue;
                }

                setObjectWorldTransform(object, body.position, body.quaternion);

                if (body.position[1] < -40) {
                    rigidBody.remove(world, body);
                    bodyIdByNodeIdRef.current.delete(nodeId);
                    bodyMetaByIdRef.current.delete(bodyId);
                    editor.deleteNode(nodeId);
                }
            }
        }

        if (debugStateRef.current) {
            debugRenderer.update(debugStateRef.current, world);
        }
    });

    return debug && mode === PrefabEditorMode.Edit && debugStateRef.current
        ? <primitive object={debugStateRef.current.object3d} />
        : null;
});

CrashcatRuntime.displayName = "CrashcatRuntime";