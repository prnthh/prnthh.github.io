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
            const meshGeometries: THREE.BufferGeometry[] = [];
            const materials: THREE.Material[] = [];
            let baseAttributes: string[] | null = null;
            const materialMap = new Map<THREE.Material, number>();
            const geometryGroups: { start: number, count: number, materialIndex: number }[] = [];
            let indexOffset = 0;
            root?.traverse?.((obj: any) => {
                if (obj.isMesh) {
                    const geom = obj.geometry.clone();
                    obj.updateWorldMatrix?.(true, false);
                    geom.applyMatrix4(obj.matrixWorld);
                    const attrNames = Object.keys(geom.attributes);
                    if (!baseAttributes) baseAttributes = attrNames;
                    if (
                        baseAttributes.length === attrNames.length &&
                        baseAttributes.every((name, i) => name === attrNames[i])
                    ) {
                        let matIdx = materialMap.get(obj.material);
                        if (matIdx === undefined) {
                            matIdx = materials.length;
                            materials.push(obj.material);
                            materialMap.set(obj.material, matIdx);
                        }
                        const count = geom.index ? geom.index.count : geom.getAttribute('position').count;
                        geometryGroups.push({ start: indexOffset, count, materialIndex: matIdx });
                        indexOffset += count;
                        meshGeometries.push(geom);
                    }
                }
            });
            if (meshGeometries.length && materials.length) {
                const mergedGeometry = mergeGeometries(meshGeometries, true);
                mergedGeometry.clearGroups();
                geometryGroups.forEach(g => mergedGeometry.addGroup(g.start, g.count, g.materialIndex));
                result[modelKey] = new THREE.Mesh(mergedGeometry, materials);
            }
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
                        const mesh = meshes[group.instances[0].meshPath];
                        if (!mesh) return null;
                        return <InstancedRigidGroup key={key} group={group} mesh={mesh} />;
                    })}
                    {/* Render children (non-physics instances handled by GameInstance) */}
                    {children}
                </GameInstanceContext.Provider>
            )}
        </Merged>
    );
}

// --- InstancedRigidGroup: Handles instanced rigidbodies for a group ---
function InstancedRigidGroup({ group, mesh }: { group: { physicsType: string, instances: InstanceData[] }, mesh: THREE.Mesh }) {
    const instancedMeshRef = React.useRef<THREE.InstancedMesh>(null);
    React.useEffect(() => {
        if (!instancedMeshRef.current) return;
        const dummy = new THREE.Object3D();
        group.instances.forEach((inst, i) => {
            dummy.position.set(...inst.position);
            dummy.rotation.set(...inst.rotation);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        instancedMeshRef.current.frustumCulled = false;
    }, [group.instances]);
    return (
        <InstancedRigidBodies
            instances={group.instances.map(inst => ({
                key: inst.id,
                position: inst.position,
                rotation: inst.rotation,
                scale: [1, 1, 1],
            }))}
            colliders="hull"
            type={group.physicsType as 'dynamic' | 'fixed'}
        >
            <instancedMesh
                ref={instancedMeshRef}
                args={[mesh.geometry, mesh.material, group.instances.length]}
                castShadow
                receiveShadow
                frustumCulled={false}
            />
        </InstancedRigidBodies>
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