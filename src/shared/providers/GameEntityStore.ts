import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { immer } from "zustand/middleware/immer";

export const knownEntityTypes = ['pickupable', 'NPC', 'room'] as const

export type Entity = {
    id: string
    type: typeof knownEntityTypes[number]
    [key: string]: any
}


const useGameStore = create(
    immer(
    combine(
        {
            entities: [] as Array<Entity>,
        },
        (set, get) => {
            return {
                addEntity: (entity: Partial<Entity>) => {
                    const id =
                        (entity as Entity).id ??
                        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
                            ? (crypto as any).randomUUID()
                            : Math.random().toString(36).slice(2, 9))

                    const newEntity: Entity = { ...(entity as object), id } as Entity

                    set((state) => {
                        state.entities.push(newEntity)
                    })

                    return id
                },
                removeEntity: (entityId: string) => {
                    set((state) => {
                        state.entities = state.entities.filter((e: Entity) => e.id !== entityId)
                    })
                },
                updateEntity: (id: string, updates: Partial<Entity>) => {
                    set((state) => {
                        const entity = state.entities.find((e: any) => e.id === id)
                        if (entity) {
                            Object.assign(entity, updates)
                        }
                    })
                },
                resetWorld: () => {
                    set(() => ({ entities: []}))
                }
            }
        },
    )  ),
)

export const allEntityIDsByType = (type: string) => {
    return useGameStore(useShallow((state) => state.entities.filter((e) => e.type === type).map((e) => e.id)))
}

export const useEntityById = (id: string) => {
    return useGameStore(useShallow((state) => state.entities.find((e) => e.id === id)))
}

// Non-hook function to get entities directly from store
export const getEntitiesByType = (type: string) => {
    return useGameStore.getState().entities.filter((e) => e.type === type)
}

export const getEntityById = (id: string) => {
    return useGameStore.getState().entities.find((e) => e.id === id)
}

export default useGameStore