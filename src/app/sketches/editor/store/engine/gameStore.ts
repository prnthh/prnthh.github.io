import { create } from 'zustand';
import { addMeshComponent } from './components/MeshComponent';

// Component and GameObject types as defined above
type ComponentType = 'transform' | 'renderer' | 'collider' | 'mesh';

interface TransformData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parent?: string;
  children: string[];
}

interface RendererData {
  mesh: string;
  material: string;
}

interface ColliderData {
  shape: 'box' | 'sphere' | 'capsule';
  size: [number, number, number];
}

type ComponentData = {
  transform: TransformData;
  renderer: RendererData;
  collider: ColliderData;
};

type Components = {
  transform: TransformData;
} & {
  [K in Exclude<ComponentType, 'transform'>]?: K extends keyof ComponentData ? ComponentData[K] : never;
};

interface GameObject {
  id: string;
  components: Components;
}

// Store interface with state and actions
interface GameState {
  gameObjects: Record<string, GameObject>;
  logs: string[];
  entityCount: number;
  selectedEntity: string | null;
  addLog: (message: string) => void;
  createGameObject: (initialData: Partial<Components> & { transform: Partial<TransformData> }) => string;
  destroyGameObject: (id: string) => void;
  setParent: (id: string, parentId: string | null) => void;
  addComponent: (id: string, componentType: ComponentType | string, data: any) => void;
  removeComponent: (id: string, componentType: ComponentType | string) => void;
  updateComponent: <T extends ComponentType | string>(id: string, componentType: T, updates: Partial<any>) => void;
  setEntityRefs: (id: string, refs: { rigidBody?: any; mesh?: any; collider?: any }) => void;
}

// Placeholder for ID generation (implement with uuid or similar)
const generateId = (): string => `go_${Math.random().toString(36).substr(2, 9)}`;

// Create the store
const useGameStore = create<GameState>((set, get) => ({
  gameObjects: {},
  logs: [],
  entityCount: 0,
  selectedEntity: null, // <-- Initialize selected entity
  addLog: (message) => set((state) => ({ logs: [...state.logs, message] })),

  /** Create a new GameObject with initial components */
  createGameObject: (initialData) => {
    const id = generateId();
    const transform: TransformData = {
      position: initialData.transform?.position ?? [0, 0, 0],
      rotation: initialData.transform?.rotation ?? [0, 0, 0],
      scale: initialData.transform?.scale ?? [1, 1, 1],
      parent: initialData.transform?.parent,
      children: [],
    };
    const components: Components = { ...initialData, transform };
    set((state) => {
      const newGameObjects = { ...state.gameObjects, [id]: { id, components } };
      if (transform.parent) {
        const parent = newGameObjects[transform.parent];
        if (parent) {
          const newParentTransform = {
            ...parent.components.transform,
            children: [...parent.components.transform.children, id],
          };
          newGameObjects[transform.parent] = {
            ...parent,
            components: { ...parent.components, transform: newParentTransform },
          };
        }
      }
      return { gameObjects: newGameObjects };
    });
    return id;
  },

  /** Destroy a GameObject and its descendants */
  destroyGameObject: (id) => {
    set((state) => {
      const gameObject = state.gameObjects[id];
      if (!gameObject) return state;

      // Collect all descendant IDs
      const toDestroy = new Set<string>([id]);
      const queue = [id];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const current = state.gameObjects[currentId];
        if (current?.components.transform.children) {
          current.components.transform.children.forEach((childId) => {
            toDestroy.add(childId);
            queue.push(childId);
          });
        }
      }

      // Remove all collected GameObjects
      const newGameObjects = { ...state.gameObjects };
      toDestroy.forEach((destroyId) => delete newGameObjects[destroyId]);

      // Update parent's children list
      const parentId = gameObject.components.transform.parent;
      if (parentId && newGameObjects[parentId]) {
        const parent = newGameObjects[parentId];
        const newParentTransform = {
          ...parent.components.transform,
          children: parent.components.transform.children.filter((childId) => childId !== id),
        };
        newGameObjects[parentId] = {
          ...parent,
          components: { ...parent.components, transform: newParentTransform },
        };
      }

      return { gameObjects: newGameObjects };
    });
  },

  /** Set or unset a GameObject's parent */
  setParent: (id, parentId) => {
    set((state) => {
      const gameObject = state.gameObjects[id];
      if (!gameObject || gameObject.components.transform.parent === parentId) return state;

      const newGameObjects = { ...state.gameObjects };

      // Remove from old parent's children
      const oldParentId = gameObject.components.transform.parent;
      if (oldParentId && newGameObjects[oldParentId]) {
        const oldParent = newGameObjects[oldParentId];
        const newOldParentTransform = {
          ...oldParent.components.transform,
          children: oldParent.components.transform.children.filter((childId) => childId !== id),
        };
        newGameObjects[oldParentId] = {
          ...oldParent,
          components: { ...oldParent.components, transform: newOldParentTransform },
        };
      }

      // Update this GameObject's parent
      const newTransform = { ...gameObject.components.transform, parent: parentId || undefined };
      newGameObjects[id] = {
        ...gameObject,
        components: { ...gameObject.components, transform: newTransform },
      };

      // Add to new parent's children
      if (parentId && newGameObjects[parentId]) {
        const newParent = newGameObjects[parentId];
        const newNewParentTransform = {
          ...newParent.components.transform,
          children: [...newParent.components.transform.children, id],
        };
        newGameObjects[parentId] = {
          ...newParent,
          components: { ...newParent.components, transform: newNewParentTransform },
        };
      }

      return { gameObjects: newGameObjects };
    });
  },

  /** Add a component to a GameObject */
  addComponent: (id, componentType, data) => {
    set((state) => {
      const gameObject = state.gameObjects[id];
      if (!gameObject || componentType === 'transform') return state;
      // Use mesh component registration function
      if (componentType === 'mesh') {
        return {
          gameObjects: {
            ...state.gameObjects,
            [id]: addMeshComponent(gameObject, data),
          },
        };
      }
      const newComponents = { ...gameObject.components, [componentType]: data };
      return {
        gameObjects: {
          ...state.gameObjects,
          [id]: { ...gameObject, components: newComponents },
        },
      };
    });
  },

  /** Remove a component from a GameObject (except transform) */
  removeComponent: (id, componentType) => {
    set((state) => {
      const gameObject = state.gameObjects[id];
      if (!gameObject || componentType === 'transform') return state;

      const { [componentType]: _, ...restComponents } = gameObject.components as any;
      return {
        gameObjects: {
          ...state.gameObjects,
          [id]: { ...gameObject, components: restComponents as Components },
        },
      };
    });
  },

  /** Update a component's properties */
  updateComponent: (id, componentType, updates) => {
    set((state) => {
      const gameObject = state.gameObjects[id];
      if (!gameObject || !(gameObject.components as any)[componentType]) return state;

      const currentData = (gameObject.components as any)[componentType];
      const newData = { ...currentData, ...updates };
      const newComponents = { ...gameObject.components, [componentType]: newData };
      return {
        gameObjects: {
          ...state.gameObjects,
          [id]: { ...gameObject, components: newComponents },
        },
      };
    });
  },

  /** Set entity references (rigidBody, mesh, collider, etc.) */
  setEntityRefs: (id, refs) => set((state) => {
    // Attach refs to the gameObject (non-serializable, for runtime use only)
    const gameObject = state.gameObjects[id];
    if (!gameObject) return state;
    (gameObject as any).refs = { ...((gameObject as any).refs || {}), ...refs };
    return {
      gameObjects: {
        ...state.gameObjects,
        [id]: gameObject,
      },
    };
  }),
}));

export default useGameStore;