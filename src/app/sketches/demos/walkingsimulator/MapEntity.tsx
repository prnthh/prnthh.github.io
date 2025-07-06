import React, { createContext, useContext, useMemo, useRef } from "react";
import { useGLTF, Merged } from "@react-three/drei";
import * as THREE from "three";
import { InstancedRigidBodies, RapierRigidBody } from "@react-three/rapier";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface MapEntity {
    id: string;
    gltf: string;
    transforms: {
        pos: [number, number, number];
        scale: [number, number, number];
    };
}

type EntityInstancesType = Record<string, React.FC<any>>;
const EntityInstancesContext = createContext<EntityInstancesType | undefined>(undefined);

export function MapEntityInstancesProvider({ children, mapEntities }: { children: React.ReactNode, mapEntities: MapEntity[] }) {
    const uniqueGltfPaths = useMemo(() => Array.from(new Set(mapEntities.map(e => e.gltf))), [mapEntities]);
    // useGLTF can take an array and returns an array of models
    const gltfObjects = useGLTF(uniqueGltfPaths);
    const gltfEntries = uniqueGltfPaths.map((gltf, i) => [gltf, gltfObjects[i]] as [string, any]);

    // Collect all meshes from each scene
    function getMeshesFromScene(scene: THREE.Group) {
        const meshes: Record<string, THREE.Mesh> = {};
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                meshes[child.name] = child as THREE.Mesh;
            }
        });
        return meshes;
    }

    // Merge all meshes from all loaded GLTFs
    const meshes = useMemo(() => {
        let allMeshes: Record<string, THREE.Mesh> = {};
        for (const [, gltf] of gltfEntries) {
            if (typeof gltf === "object" && "scene" in gltf) {
                allMeshes = { ...allMeshes, ...getMeshesFromScene(gltf.scene) };
            }
        }
        return allMeshes;
    }, [gltfEntries]);

    return (
        <Merged meshes={meshes} castShadow receiveShadow>
            {(instances: EntityInstancesType) => (
                <EntityInstancesContext.Provider value={instances}>
                    {children}
                </EntityInstancesContext.Provider>
            )}
        </Merged>
    );
}

interface MapEntityMeshProps {
    position: [number, number, number];
    onClick: (e: any) => void;
    gltf: string;
    transforms: { pos: [number, number, number]; scale: [number, number, number] };
}

export function MapEntityMesh({ position, onClick, gltf, transforms }: MapEntityMeshProps) {
    const instances = useContext(EntityInstancesContext);
    if (!instances) return null;

    // Render instanced mesh for the given gltf
    const filterFn = (name: string) => name.toLowerCase().includes(gltf.split('/').pop()?.split('.')[0] || '');
    const scale = (typeof transforms !== 'undefined' && transforms.scale) ? transforms.scale : [1, 1, 1];

    return (
        <group position={position} onClick={onClick}>
            {Object.entries(instances)
                .filter(([name]) => filterFn(name))
                .map(([name, Instance]) => (
                    <Instance
                        key={name}
                        scale={scale}
                    />
                ))}
        </group>
    );
}

// For drei GLTF loader
useGLTF.preload("/models/environment/rocks.glb");
useGLTF.preload("/models/environment/tree.glb");

export function useMapEntityMeshes(mapEntities: MapEntity[]) {
    const uniqueGltfPaths = useMemo(() => Array.from(new Set(mapEntities.map(e => e.gltf))), [mapEntities]);
    const gltfObjects = useGLTF(uniqueGltfPaths);
    const gltfEntries = uniqueGltfPaths.map((gltf, i) => [gltf, gltfObjects[i]] as [string, any]);

    // Find the first mesh for each gltf
    const meshMap: Record<string, { geometry: THREE.BufferGeometry; material: THREE.Material } | undefined> = {};
    for (const [gltf, gltfObj] of gltfEntries) {
        let foundMesh: THREE.Mesh | undefined;
        if (typeof gltfObj === "object" && gltfObj !== null && "scene" in gltfObj) {
            (gltfObj.scene as THREE.Group).traverse((child) => {
                if ((child as THREE.Mesh).isMesh && !foundMesh) foundMesh = child as THREE.Mesh;
            });
            if (foundMesh) {
                meshMap[gltf] = {
                    geometry: foundMesh.geometry,
                    material: Array.isArray(foundMesh.material) ? foundMesh.material[0] : foundMesh.material
                };
            }
        }
    }
    return meshMap;
}

// Utility to get merged mesh for a gltf scene (NOT a hook)
function getMergedMeshFromScene(scene: THREE.Group) {
    const geometries: THREE.BufferGeometry[] = [];
    let material: THREE.Material | undefined;
    scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            geometries.push(mesh.geometry.clone());
            if (!material) material = mesh.material as THREE.Material;
        }
    });
    if (geometries.length === 0) return undefined;
    const mergedGeometry = mergeGeometries(geometries, false);
    return { geometry: mergedGeometry, material };
}

export function MapEntities({ mapEntities }: { mapEntities: MapEntity[] }) {
    const rigidBodiesRefs = useRef<Record<string, RapierRigidBody[]>>({});
    const cubesRefs = useRef<Record<string, THREE.InstancedMesh | null>>({});

    // Group entities by gltf
    const entitiesByGltf = useMemo(() => {
        const grouped: Record<string, MapEntity[]> = {};
        for (const entity of mapEntities) {
            const gltf = entity.gltf;
            if (!gltf) continue;
            if (!grouped[gltf]) grouped[gltf] = [];
            grouped[gltf].push(entity);
        }
        return grouped;
    }, [mapEntities]);

    // Get mesh for each gltf (load all GLTFs at once)
    const gltfPaths = useMemo(() => Object.keys(entitiesByGltf), [entitiesByGltf]);
    const gltfObjects = useGLTF(gltfPaths);
    const meshDataArr = gltfPaths.map((gltf, i) => {
        const gltfObj = gltfObjects[i];
        if (gltfObj && gltfObj.scene) {
            return [gltf, getMergedMeshFromScene(gltfObj.scene)];
        }
        return [gltf, undefined];
    });
    const meshData = Object.fromEntries(meshDataArr);

    return (
        <>
            {Object.entries(entitiesByGltf).map(([gltf, entities]) => {
                const mesh = meshData[gltf];
                if (!mesh || entities.length === 0) return null;
                const getRigidBodyInstances = (entities: MapEntity[]) =>
                    entities.map((entity, idx) => ({
                        key: entity.id ?? idx,
                        name: entity.id ?? `${gltf}-instance-${idx}`,
                        position: [
                            (entity.transforms.pos[0]),
                            (entity.transforms.pos[1]),
                            (entity.transforms.pos[2])
                        ] as [number, number, number],
                        rotation: [0, 0, 0] as [number, number, number],
                        scale: entity.transforms.scale,
                    }));
                return (
                    <InstancedRigidBodies
                        key={gltf}
                        instances={getRigidBodyInstances(entities)}
                        type="fixed"
                        colliders="hull"
                        ref={el => {
                            if (el) {
                                const bodies = (el as (RapierRigidBody | null)[]).filter(Boolean) as RapierRigidBody[];
                                rigidBodiesRefs.current[gltf] = bodies;
                            }
                        }}
                    >
                        <instancedMesh
                            key={gltf + "-mesh"}
                            name={gltf}
                            ref={el => { cubesRefs.current[gltf] = el; }}
                            args={[mesh.geometry, mesh.material, entities.length]}
                            dispose={null}
                            castShadow
                            frustumCulled={false}
                            onClick={e => {
                                e.stopPropagation();
                                const idx = e.instanceId;
                                const bodies = rigidBodiesRefs.current[gltf];
                                if (
                                    typeof idx === 'number' &&
                                    bodies &&
                                    Array.isArray(bodies) &&
                                    bodies[idx]
                                ) {
                                    bodies[idx].applyImpulse(
                                        { x: Math.random(), y: Math.random(), z: Math.random() },
                                        true
                                    );
                                }
                            }}
                        />
                    </InstancedRigidBodies>
                );
            })}
        </>
    );
}
