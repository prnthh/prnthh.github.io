import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { EntityId, Entity, System, OrbitComponent, Object3DComponent, createEntity, ECSStoreType } from "./ecs";

import Ground, { GroundPropsType } from "../../floor/ground/ground/flat";
import Ped, { PedPropsType } from "../../controllers/click/ped/ped";
import { SpotLight } from "@react-three/drei";
import wanderSystem from "./systems/wanderSystem";
import orbitSystem from "./systems/orbitSystem";
import * as THREE from "three";

export const ECS_COMPONENTS: Record<string, React.ComponentType<any>> = {
    Ped,
    Ground,
    SpotLight,
    // Add more mappings here as you add new ECS render components
};

export const ECS_SYSTEMS: Record<string, System> = {
    wanderSystem: wanderSystem,
    orbitSystem: orbitSystem,
}

// Zustand ECS Store using new ECS types
const useECSStore = create(
    subscribeWithSelector<ECSStoreType>((set, get) => ({
        entities: new Map<EntityId, Entity>(),
        systems: [] as System[],
        selectedEntity: null,
        addEntity: (id: EntityId, initialComponents: Record<string, any> = {}) =>
            set((state: ECSStoreType) => {
                const entity = createEntity(id, {
                    Object3D: { object3D: new THREE.Object3D() },
                    ...initialComponents
                });
                return { entities: new Map(state.entities).set(id, entity) };
            }),
        removeEntity: (id: EntityId) =>
            set((state: ECSStoreType) => {
                const entities = new Map(state.entities);
                entities.delete(id);
                return { entities };
            }),
        addComponent: (id: EntityId, componentName: string, data: any) =>
            set((state: ECSStoreType) => {
                const entity = state.entities.get(id);
                if (!entity) return state;
                const components = new Map(entity.components);
                components.set(componentName, data);
                return { entities: new Map(state.entities).set(id, { ...entity, components }) };
            }),
        removeComponent: (id: EntityId, componentName: string) =>
            set((state: ECSStoreType) => {
                const entity = state.entities.get(id);
                if (!entity) return state;
                const components = new Map(entity.components);
                components.delete(componentName);
                return { entities: new Map(state.entities).set(id, { ...entity, components }) };
            }),
        updateComponent: (id: EntityId, componentName: string, data: Partial<any>) =>
            set((state: ECSStoreType) => {
                const entity = state.entities.get(id);
                if (!entity) return state;
                const components = new Map(entity.components);
                const prev = components.get(componentName) || {};
                components.set(componentName, { ...prev, ...data });
                return { entities: new Map(state.entities).set(id, { ...entity, components }) };
            }),
        addSystem: (system: System) => set((state: ECSStoreType) => ({ systems: [...state.systems, system] })),
        setSelectedEntity: (id: EntityId | null) => set({ selectedEntity: id }),
    }))
);

export default useECSStore;
