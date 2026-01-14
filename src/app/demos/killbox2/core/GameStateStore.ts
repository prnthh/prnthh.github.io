import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { immer } from "zustand/middleware/immer"

export type GameEntity = {
    position: [number, number, number],
    rotation: [number, number],
    data: Record<string, any>,
}

const DEFAULT_ENTITY: GameEntity = {
    position: [0, 0, 0],
    rotation: [0, 0],
    data: {},
};

export const useGameStateStore = create(
    immer(
        combine(
            {
                entities: {} as Record<string, GameEntity>,
                localEntity: { ...DEFAULT_ENTITY, data: { ...DEFAULT_ENTITY.data } } as GameEntity,
            },
            (set, get) => ({
                updateEntity: (entityId: string, state: GameEntity) => {
                    set((draft) => {
                        draft.entities[entityId] = state
                    })
                },
                removeEntity: (entityId: string) => {
                    set((draft) => {
                        delete draft.entities[entityId]
                    })
                },
                setLocalEntity: (state: GameEntity) => {
                    set((draft) => {
                        draft.localEntity = state
                    })
                },
                setData: (key: string, value: any) => {
                    set((draft) => {
                        draft.localEntity.data[key] = value
                    })
                },
                getData: (key: string) => get().localEntity.data[key],
                updateData: (key: string, updater: (prev: any) => any) => {
                    set((draft) => {
                        draft.localEntity.data[key] = updater(draft.localEntity.data[key])
                    })
                    return get().localEntity.data[key]
                },
                reset: () => {
                    set(() => ({ entities: {}, localEntity: { ...DEFAULT_ENTITY, data: { ...DEFAULT_ENTITY.data } } }))
                }
            }),
        )
    ),
)

// Hook to get all entities
export const useEntities = () => {
    return useGameStateStore(useShallow((state) => state.entities))
}

// Hook to get a specific entity
export const useEntity = (entityId: string) => {
    return useGameStateStore(useShallow((state) => state.entities[entityId]))
}

// Non-hook functions to get data directly from store
export const getEntities = () => {
    return useGameStateStore.getState().entities
}

export const getEntity = (entityId: string) => {
    return useGameStateStore.getState().entities[entityId]
}

// Hooks to get/set local entity state
export const useLocalEntity = () => {
    return useGameStateStore(useShallow((state) => state.localEntity))
}

// Non-hook functions to get/set local entity state
export const getLocalEntity = () => {
    return useGameStateStore.getState().localEntity
}
