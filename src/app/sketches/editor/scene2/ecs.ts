// ECS core logic for scalable, Unity-like architecture
import { Object3D } from "three";

// Component type registry for type safety and extensibility
export type ComponentData = Record<string, any>;

export type EntityId = number;

export type Entity = {
    id: EntityId;
    components: Map<string, ComponentData>;
};

export type System = (entities: Map<EntityId, Entity>, delta: number) => void;

export type ECSStoreType = {
    entities: Map<EntityId, Entity>;
    systems: System[];
    selectedEntity: EntityId | null;
    addEntity: (id: EntityId, initialComponents?: Record<string, ComponentData>) => void;
    removeEntity: (id: EntityId) => void;
    addComponent: (id: EntityId, componentName: string, data: ComponentData) => void;
    removeComponent: (id: EntityId, componentName: string) => void;
    updateComponent: (id: EntityId, componentName: string, data: Partial<ComponentData>) => void;
    addSystem: (system: System) => void;
    setSelectedEntity: (id: EntityId | null) => void;
};

// Helper to create a new entity
export function createEntity(id: EntityId, initialComponents: Record<string, ComponentData> = {}): Entity {
    const components = new Map<string, ComponentData>();
    for (const [name, data] of Object.entries(initialComponents)) {
        components.set(name, data);
    }
    return { id, components };
}

// Example: OrbitComponent type
export type OrbitComponent = {
    parentId: EntityId | null;
    radius: number;
    speed: number;
    angle: number;
};

// Example: Object3DComponent type
export type Object3DComponent = {
    object3D: Object3D;
};

// You can add more component types here as your ECS grows
