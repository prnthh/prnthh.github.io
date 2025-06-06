import React from "react";
import { useGLTF } from "@react-three/drei";

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
    resourceAmount: number; // current available resource
    maxResource: number; // max resource
    depleted: boolean;
    replenishTicksLeft: number; // ticks until replenished if depleted
}


interface MapEntityMeshProps {
    entity: MapEntity;
    position: [number, number, number];
    onClick: (e: any) => void;
}

export function MapEntityMesh({ entity, position, onClick }: MapEntityMeshProps) {
    // Load GLTF models
    const rocks = useGLTF("/models/environment/rocks.glb");
    const tree = useGLTF("/models/environment/tree.glb");

    if (entity.type.kind === "tree") {
        if (entity.depleted) {
            return null;
        }
        return (
            <group position={position} onClick={onClick} userData={{ entityId: entity.id }}>
                <primitive
                    object={tree.scene}
                    scale={[0.66, 0.66, 0.66]}
                    userData={{ entityId: entity.id }}
                />
            </group>
        );
    } else if (entity.type.kind === "ore") {
        if (entity.depleted) {
            return null;
        }
        return (
            <group position={position} onClick={onClick} userData={{ entityId: entity.id }}>
                <primitive
                    object={rocks.scene}
                    scale={[0.18 * 0.66, 0.18 * 0.66, 0.18 * 0.66]}
                    userData={{ entityId: entity.id }}
                />
            </group>
        );
    }
    return null;
}

// For drei GLTF loader
useGLTF.preload("/models/environment/rocks.glb");
useGLTF.preload("/models/environment/tree.glb");
