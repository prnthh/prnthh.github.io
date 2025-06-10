import React, { createContext, useContext, useMemo } from "react";
import { useGLTF, Merged } from "@react-three/drei";
import * as THREE from "three";

// Types for map entities (trees, ores)

export type TreeType = "normal" | "star" | "heart" | "earth";
export type OreType = "copper" | "tin" | "iron" | "coal";

export type MapEntityType =
    | { kind: "tree"; treeType: TreeType }
    | { kind: "ore"; oreType: OreType };

export interface MapEntity {
    id: string;
    type: MapEntityType;
    pos: [number, number];
    extractionCooldown: number; // ticks until next extraction can occur
    resourceAmount: number; // current available resource
    maxResource: number; // max resource
    depleted: boolean;
    replenishTicksLeft: number; // ticks until replenished if depleted
}

type EntityInstancesType = Record<string, React.FC<any>>;
const EntityInstancesContext = createContext<EntityInstancesType | undefined>(undefined);

export function MapEntityInstancesProvider({ children }: { children: React.ReactNode }) {
    const rocks = useGLTF("/models/environment/rocks.glb");
    const tree = useGLTF("/models/environment/tree.glb");

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

    const meshes = useMemo(() => ({
        ...getMeshesFromScene(tree.scene),
        ...getMeshesFromScene(rocks.scene)
    }), [tree, rocks]);

    return (
        <Merged meshes={meshes} castShadow receiveShadow>
            {(instances) => (
                <EntityInstancesContext.Provider value={instances}>
                    {children}
                </EntityInstancesContext.Provider>
            )}
        </Merged>
    );
}

interface MapEntityMeshProps {
    entity: MapEntity;
    position: [number, number, number];
    onClick: (e: any) => void;
}

export function MapEntityMesh({ entity, position, onClick }: MapEntityMeshProps) {
    const instances = useContext(EntityInstancesContext);
    if (!instances) return null;
    if (entity.depleted) return null;

    // Render all meshes for each entity type
    if (entity.type.kind === "tree") {
        return (
            <group position={position} onClick={onClick} userData={{ entityId: entity.id }}>
                {Object.entries(instances)
                    .filter(([name]) => name.toLowerCase().includes("tree"))
                    .map(([name, Instance]) => (
                        <Instance
                            key={name}
                            scale={[0.66, 0.66, 0.66]}
                            userData={{ entityId: entity.id }}
                        />
                    ))}
            </group>
        );
    } else if (entity.type.kind === "ore") {
        return (
            <group position={position} onClick={onClick} userData={{ entityId: entity.id }}>
                {Object.entries(instances)
                    .filter(([name]) => name.toLowerCase().includes("rock") || name.toLowerCase().includes("ore"))
                    .map(([name, Instance]) => (
                        <Instance
                            key={name}
                            scale={[0.18 * 0.66, 0.18 * 0.66, 0.18 * 0.66]}
                            userData={{ entityId: entity.id }}
                        />
                    ))}
            </group>
        );
    }
    return null;
}

// For drei GLTF loader
useGLTF.preload("/models/environment/rocks.glb");
useGLTF.preload("/models/environment/tree.glb");
