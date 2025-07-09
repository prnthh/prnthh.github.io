import React, { createContext, useContext, useMemo } from "react";
import { useGLTF, Merged } from "@react-three/drei";
import { useRoom } from "./ColyseusProvider";
import * as THREE from "three";
import { MapEntity as ServerMapEntity } from "../../../server/src/rooms/schema/MyRoomState";

// Context for instanced meshes
const EntityInstancesContext = createContext<Record<string, React.FC<any>> | undefined>(undefined);

export function MapEntityInstancesProvider({ children }: { children: React.ReactNode }) {
    const loadedModels = useGLTF(["/models/environment/rocks.glb", "/models/environment/tree.glb"]);

    function getMeshesFromScene(scene: THREE.Group) {
        const meshes: Record<string, THREE.Mesh> = {};
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                meshes[child.name] = child as THREE.Mesh;
            }
        });
        return meshes;
    }

    const meshes = useMemo(() => {
        return loadedModels.reduce((acc, model) => {
            Object.assign(acc, getMeshesFromScene(model.scene));
            return acc;
        }, {} as Record<string, THREE.Mesh>);
    }, [loadedModels]);

    return (
        <Merged frustumCulled={false} meshes={meshes} castShadow receiveShadow>
            {(instances) => (
                <EntityInstancesContext.Provider value={instances}>
                    {children}
                </EntityInstancesContext.Provider>
            )}
        </Merged>
    );
}

const ENTITY_TYPE_MESH_MAP: Record<string, { filter: (name: string) => boolean; scale: [number, number, number] }> = {
    tree: {
        filter: (name: string) => name.toLowerCase().includes("tree"),
        scale: [0.8, 0.8, 0.8],
    },
    rock: {
        filter: (name: string) => name.toLowerCase().includes("rock"),
        scale: [0.2, 0.2, 0.12],
    },
};

function MapEntityMesh({ entity, onClick }: { entity: ServerMapEntity, onClick?: (e: any) => void }) {
    const instances = useContext(EntityInstancesContext);
    if (!instances) return null;
    if (entity.isDepleted) return null;

    const pos = entity.position;
    const mapping = ENTITY_TYPE_MESH_MAP[entity.entityType];
    if (mapping) {
        return (
            <group position={[pos.x, pos.y, pos.z]} userData={{ entityId: entity.id }} onClick={onClick} >
                {Object.entries(instances)
                    .filter(([name]) => mapping.filter(name))
                    .map(([name, Instance]) => (
                        <Instance key={name} scale={mapping.scale} userData={{ entityId: entity.id }} />
                    ))}
            </group>
        );
    }
    return null;
}

const MapEntities = () => {
    const { state } = useRoom();
    const mapEntities = state?.mapEntities || {};

    return (
        <MapEntityInstancesProvider>
            {Object.values(mapEntities).map((entity: any) => (
                <MapEntityMesh onClick={() => {
                    console.log("Entity clicked:", entity.id);
                }} key={entity.id} entity={entity as ServerMapEntity} />
            ))}
        </MapEntityInstancesProvider>
    );
};

export default MapEntities;