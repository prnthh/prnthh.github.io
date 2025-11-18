import React, { createContext, useContext, useMemo, useRef, useState, useCallback } from "react";
import { Merged } from '@react-three/drei';
import * as THREE from 'three';
import { InstancedRigidBodies } from "@react-three/rapier";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";

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
    removeInstance: (id: string) => void;
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

    const addInstance = useCallback((instance: InstanceData) => {
        setInstances(prev => {
            const idx = prev.findIndex(i => i.id === instance.id);
            if (idx !== -1) {
                const existing = prev[idx];
                if (
                    existing.meshPath === instance.meshPath &&
                    existing.position[0] === instance.position[0] &&
                    existing.position[1] === instance.position[1] &&
                    existing.position[2] === instance.position[2] &&
                    existing.rotation[0] === instance.rotation[0] &&
                    existing.rotation[1] === instance.rotation[1] &&
                    existing.rotation[2] === instance.rotation[2] &&
                    existing.physics?.props?.type === instance.physics?.props?.type
                ) {
                    return prev;
                }
                const copy = [...prev];
                copy[idx] = instance;
                return copy;
            }
            return [...prev, instance];
        });
    }, []);

    const removeInstance = useCallback((id: string) => {
        setInstances(prev => prev.filter(i => i.id !== id));
    }, []);

    // Memoize mesh extraction and merging
    const meshes = useMemo(() => {
        const result: Record<string, THREE.Mesh> = {};
        Object.entries(models).forEach(([modelKey, model]) => {
            const root = model?.scene ?? model;
            const matToGeoms = new Map<THREE.Material, THREE.BufferGeometry[]>();

            root?.traverse?.((obj: any) => {
                if (obj.isMesh && !Array.isArray(obj.material)) {
                    const mat = obj.material;
                    let geoms = matToGeoms.get(mat);
                    if (!geoms) {
                        geoms = [];
                        matToGeoms.set(mat, geoms);
                    }
                    const geom = obj.geometry.clone();
                    obj.updateWorldMatrix?.(true, false);
                    geom.applyMatrix4(obj.matrixWorld);
                    geoms.push(geom);
                }
            });

            if (matToGeoms.size === 0) return;

            const uniqueMaterials = Array.from(matToGeoms.keys());
            const mergedGeomsPerMat = uniqueMaterials
                .map((mat) => {
                    const geoms = matToGeoms.get(mat)!;
                    return BufferGeometryUtils.mergeGeometries(geoms, false);
                })
                .filter((g): g is THREE.BufferGeometry => g !== null);

            if (mergedGeomsPerMat.length === 0) return;

            if (mergedGeomsPerMat.length === 1) {
                result[modelKey] = new THREE.Mesh(mergedGeomsPerMat[0], uniqueMaterials[0]);
            } else {
                const allAttributes = new Set<string>();
                mergedGeomsPerMat.forEach(geom => {
                    Object.keys(geom.attributes).forEach(attr => allAttributes.add(attr));
                });

                const normalizedGeoms = mergedGeomsPerMat.map(geom => {
                    const clone = geom.clone();
                    allAttributes.forEach(attr => {
                        if (!clone.attributes[attr] && attr === 'uv') {
                            const posCount = clone.attributes.position.count;
                            clone.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posCount * 2), 2));
                        }
                        if (!clone.attributes[attr] && attr === 'normal') {
                            clone.computeVertexNormals();
                        }
                    });
                    return clone;
                });

                const finalGeometry = BufferGeometryUtils.mergeGeometries(normalizedGeoms, true);
                finalGeometry.groups.forEach((group: any, idx: number) => {
                    group.materialIndex = idx;
                });
                result[modelKey] = new THREE.Mesh(finalGeometry, uniqueMaterials);
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

    return (
        <Merged meshes={meshes} castShadow receiveShadow>
            {(instancesMap) => (
                <GameInstanceContext.Provider value={{ addInstance, removeInstance, instances, meshes, instancesMap }}>
                    {Object.entries(grouped).map(([key, group]) => {
                        if (group.physicsType === 'none') return null;
                        const mesh = meshes[group.instances[0].meshPath];
                        if (!mesh) return null;
                        return <InstancedRigidGroup key={key} group={group} mesh={mesh} />;
                    })}
                    {children}
                </GameInstanceContext.Provider>
            )}
        </Merged>
    );
}

// --- InstancedRigidGroup: Handles instanced rigidbodies for a group ---
function InstancedRigidGroup({ group, mesh }: { group: { physicsType: string, instances: InstanceData[] }, mesh: THREE.Mesh }) {
    // Use a key to force remount when instance count changes
    const key = `${group.instances.length}`;

    return (
        <InstancedRigidBodies
            key={key}
            instances={group.instances.map(inst => ({
                key: inst.id,
                position: inst.position,
                rotation: inst.rotation,
                scale: [1, 1, 1],
            }))}
            colliders="hull"
            type={group.physicsType as 'dynamic' | 'fixed'}
        >
            <InstancedMeshUpdater
                geometry={mesh.geometry}
                material={mesh.material}
                instances={group.instances}
                count={group.instances.length}
            />
        </InstancedRigidBodies>
    );
}

// Separate component to handle mesh matrix updates
function InstancedMeshUpdater({
    geometry,
    material,
    instances,
    count,
}: {
    geometry: THREE.BufferGeometry;
    material: THREE.Material | THREE.Material[];
    instances: InstanceData[];
    count: number;
}) {
    const instancedMeshRef = React.useRef<THREE.InstancedMesh>(null);

    React.useEffect(() => {
        if (!instancedMeshRef.current || count === 0) return;

        const dummy = new THREE.Object3D();
        instances.forEach((inst, i) => {
            dummy.position.set(...inst.position);
            dummy.rotation.set(...inst.rotation);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        instancedMeshRef.current.frustumCulled = false;
    }, [instances, count, geometry, material]);

    if (count === 0) return null;

    return (
        <instancedMesh
            ref={instancedMeshRef}
            args={[geometry, material, count]}
            castShadow
            receiveShadow
            frustumCulled={false}
        />
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
    const idRef = useRef<string | null>(null);
    if (!idRef.current) idRef.current = Math.random().toString(36).substr(2, 9);

    const posKey = position.join(',');
    const rotKey = rotation.join(',');
    const physicsType = physics?.props?.type || 'none';

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
            ctx.removeInstance(idRef.current!);
        };
    }, [ctx?.addInstance, ctx?.removeInstance, modelUrl, posKey, rotKey, physicsType]);

    if (!ctx || !ctx.instancesMap) return null;
    if (physics) return null;

    const meshKeys = Object.keys(ctx.instancesMap).filter(key => key.startsWith(modelUrl));
    return (
        <>
            {meshKeys.map((key) => {
                const Instance = ctx.instancesMap![key];
                return <Instance key={key}>{children}</Instance>;
            })}
        </>
    );
}