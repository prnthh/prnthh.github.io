import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { Merged } from '@react-three/drei';
import * as THREE from 'three';
import { InstancedRigidBodies } from "@react-three/rapier";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// --- Types ---
export type InstanceData = {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    meshPath: string;
    physics?: { props?: { type: 'dynamic' | 'fixed' } };
};

// --- Context ---
type GameInstanceContextType = {
    addInstance: (instance: InstanceData) => void;
    removeInstance: (instance: InstanceData) => void;
    instances: InstanceData[];
    meshes: Record<string, THREE.Mesh>;
    instancesMap?: Record<string, React.ComponentType<any>>;
};
const GameInstanceContext = createContext<GameInstanceContextType | null>(null);

// --- Provider ---
export function GameInstanceProvider({
    children,
    models
}: {
    children: React.ReactNode,
    models: { [filename: string]: any }
}) {
    const [instances, setInstances] = useState<InstanceData[]>([]);

    // Add or update an instance by id
    const addInstance = (instance: InstanceData) => {
        setInstances(prev => {
            const idx = prev.findIndex(i => i.id === instance.id);
            if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = instance;
                return copy;
            }
            return [...prev, instance];
        });
    };

    // Remove an instance by id
    const removeInstance = (instance: InstanceData) => {
        setInstances(prev => prev.filter(i => i.id !== instance.id));
    };

    // Memoize mesh extraction and merging
    const meshes = useMemo(() => {
        const result: Record<string, THREE.Mesh> = {};
        Object.entries(models).forEach(([modelKey, model]) => {
            const root = model?.scene ?? model;

            // Collect geometries grouped first by material, then by attribute-signature.
            // This ensures we don't drop geometries that have different attribute sets (e.g., missing uvs or colors).
            const byMaterial = new Map<THREE.Material, Map<string, THREE.BufferGeometry[]>>();

            root?.traverse?.((obj: any) => {
                if (!obj.isMesh) return;
                const geom = obj.geometry.clone();
                obj.updateWorldMatrix?.(true, false);
                geom.applyMatrix4(obj.matrixWorld);

                // Minimal requirement: must have position attribute
                if (!geom.getAttribute('position')) return;

                const attrNames = Object.keys(geom.attributes).sort();
                const attrKey = attrNames.join('|');

                const material = Array.isArray(obj.material) ? obj.material[0] : obj.material;
                if (!byMaterial.has(material)) byMaterial.set(material, new Map());
                const attrMap = byMaterial.get(material)!;
                if (!attrMap.has(attrKey)) attrMap.set(attrKey, []);
                attrMap.get(attrKey)!.push(geom);
            });

            // For each material and attribute group, merge geometries and create a mesh.
            let matCounter = 0;
            byMaterial.forEach((attrMap, material) => {
                attrMap.forEach((geomList, attrKey) => {
                    if (!geomList.length) return;
                    const merged = mergeGeometries(geomList, true);
                    const meshKey = `${modelKey}__mat${matCounter}__${attrKey}`;
                    result[meshKey] = new THREE.Mesh(merged, material);
                    matCounter += 1;
                });
            });
        });
        return result;
    }, [models]);

    // Group instances by meshPath and physics type
    const grouped = useMemo(() => {
        const groups: Record<string, { physicsType: string, instances: InstanceData[] }> = {};
        for (const inst of instances) {
            const type = inst.physics?.props?.type || 'none';
            const key = `${inst.meshPath}__${type}`;
            if (!groups[key]) groups[key] = { physicsType: type, instances: [] };
            groups[key].instances.push(inst);
        }
        return groups;
    }, [instances]);

    // Render children and instanced rigid bodies conditionally
    return (
        <Merged meshes={meshes} castShadow receiveShadow>
            {(instancesMap) => (
                <GameInstanceContext.Provider value={{ addInstance, removeInstance, instances, meshes, instancesMap }}>
                    {/* Render instanced rigid bodies for groups with physics */}
                    {Object.entries(grouped).map(([key, group]) => {
                        if (group.physicsType === 'none') return null;
                        // A model may produce multiple meshes (one per material). Render an instanced rigid group for each.
                        const basePath = group.instances[0].meshPath;
                        const meshKeys = Object.keys(meshes).filter(k => k.startsWith(basePath));
                        if (!meshKeys.length) return null;
                        const materialMeshes = meshKeys.map(mk => meshes[mk]);
                        return (
                            <InstancedRigidGroup key={key} group={group} meshes={materialMeshes} />
                        );
                    })}
                    {/* Render children (non-physics instances handled by GameInstance) */}
                    {children}
                </GameInstanceContext.Provider>
            )}
        </Merged>
    );
}

// --- InstancedRigidGroup: Handles instanced rigidbodies for a group ---
function InstancedRigidGroup({ group, meshes }: { group: { physicsType: string, instances: InstanceData[] }, meshes: THREE.Mesh[] }) {
    const physicsRef = React.useRef<THREE.InstancedMesh | null>(null);
    const visualRefs = React.useRef<Array<THREE.InstancedMesh | null>>([]);
    React.useEffect(() => {
        const dummy = new THREE.Object3D();
        for (let i = 0; i < group.instances.length; i++) {
            const inst = group.instances[i];
            dummy.position.set(...inst.position);
            dummy.rotation.set(...inst.rotation);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            // update physics mesh
            if (physicsRef.current) physicsRef.current.setMatrixAt(i, dummy.matrix);
            // update visuals
            for (const ref of visualRefs.current) {
                if (ref) ref.setMatrixAt(i, dummy.matrix);
            }
        }
        if (physicsRef.current) physicsRef.current.instanceMatrix.needsUpdate = true;
        for (const ref of visualRefs.current) {
            if (ref) ref.instanceMatrix.needsUpdate = true;
            if (ref) ref.frustumCulled = false;
        }
        if (physicsRef.current) physicsRef.current.frustumCulled = false;
    }, [group.instances]);

    // Build instances array for physics (one per logical instance)
    const physicsInstances = group.instances.map(inst => ({
        key: inst.id,
        position: inst.position,
        rotation: inst.rotation,
        scale: [1, 1, 1] as [number, number, number],
    }));

    // Use the first mesh as the physics-carrying mesh, but render all material meshes for visuals.
    const primary = meshes[0];
    return (
        <>
            <InstancedRigidBodies
                instances={physicsInstances}
                colliders="hull"
                type={group.physicsType as 'dynamic' | 'fixed'}
            >
                <instancedMesh
                    ref={physicsRef}
                    args={[primary.geometry, primary.material, group.instances.length]}
                    castShadow
                    receiveShadow
                    frustumCulled={false}
                />
            </InstancedRigidBodies>
            {/* additional visual instanced meshes (skip index 0, already rendered as physics child) */}
            {meshes.slice(1).map((m, idx) => (
                <instancedMesh
                    key={`visual_${idx}`}
                    ref={el => (visualRefs.current[idx] = el)}
                    args={[m.geometry, m.material, group.instances.length]}
                    castShadow
                    receiveShadow
                    frustumCulled={false}
                />
            ))}
        </>
    );
}

// --- GameInstance: Registers an instance and renders it if non-physics ---
export function GameInstance({
    modelUrl,
    position,
    rotation,
    physics = undefined,
    children
}: {
    modelUrl: string;
    position: [number, number, number];
    rotation: [number, number, number];
    physics?: { props?: { type: 'dynamic' | 'fixed' } };
    children?: React.ReactNode;
}) {
    const ctx = useContext(GameInstanceContext);
    const idRef = useRef<string>(null);
    if (!idRef.current) idRef.current = Math.random().toString(36).substr(2, 9);

    React.useEffect(() => {
        if (!ctx) return;
        const instance: InstanceData = {
            id: idRef.current!,
            meshPath: modelUrl,
            position,
            rotation,
            physics,
        };
        ctx.addInstance(instance);
        return () => {
            ctx.removeInstance(instance);
        };
    }, [modelUrl, position, rotation, physics]);

    if (!ctx || !ctx.instancesMap) return null;
    if (physics) return null; // Physics handled by InstancedRigidBodies
    const meshKeys = Object.keys(ctx.instancesMap).filter(key => key.startsWith(modelUrl));
    return (
        <>
            {meshKeys.map((key) => {
                const Instance = ctx.instancesMap![key];
                return (
                    <Instance key={key}>{children}</Instance>
                );
            })}
        </>
    );
}