import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { immer } from "zustand/middleware/immer"

export type PeerState = {
    position: [number, number, number],
    rotation: [number, number],
    data: Record<string, any>,
}

const DEFAULT_STATE: PeerState = {
    position: [0, 0, 0],
    rotation: [0, 0],
    data: {},
};

export const useMultiplayerStore = create(
    immer(
        combine(
            {
                peerStates: {} as Record<string, PeerState>,
                myState: { ...DEFAULT_STATE, data: { ...DEFAULT_STATE.data } } as PeerState,
            },
            (set, get) => ({
                updatePeerState: (peerId: string, state: PeerState) => {
                    set((draft) => {
                        draft.peerStates[peerId] = state
                    })
                },
                removePeer: (peerId: string) => {
                    set((draft) => {
                        delete draft.peerStates[peerId]
                    })
                },
                setMyState: (state: PeerState) => {
                    set((draft) => {
                        draft.myState = state
                    })
                },
                setData: (key: string, value: any) => {
                    set((draft) => {
                        draft.myState.data[key] = value
                    })
                },
                getData: (key: string) => get().myState.data[key],
                updateData: (key: string, updater: (prev: any) => any) => {
                    set((draft) => {
                        draft.myState.data[key] = updater(draft.myState.data[key])
                    })
                    return get().myState.data[key]
                },
                reset: () => {
                    set(() => ({ peerStates: {}, myState: { ...DEFAULT_STATE, data: { ...DEFAULT_STATE.data } } }))
                }
            }),
        )
    ),
)

// Hook to get all peer states
export const usePeerStates = () => {
    return useMultiplayerStore(useShallow((state) => state.peerStates))
}

// Hook to get a specific peer's state
export const usePeerState = (peerId: string) => {
    return useMultiplayerStore(useShallow((state) => state.peerStates[peerId]))
}

// Non-hook functions to get data directly from store
export const getPeerStates = () => {
    return useMultiplayerStore.getState().peerStates
}

export const getPeerState = (peerId: string) => {
    return useMultiplayerStore.getState().peerStates[peerId]
}

// Hooks to get/set my local player state
export const useMyState = () => {
    return useMultiplayerStore(useShallow((state) => state.myState))
}

// Non-hook functions to get/set my local player state
export const getMyState = () => {
    return useMultiplayerStore.getState().myState
}
