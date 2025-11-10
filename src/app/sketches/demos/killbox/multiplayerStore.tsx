import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { immer } from "zustand/middleware/immer"

export type PeerState = {
    position: [number, number, number],
    rotation: [number, number],
    appearance?: { [key: string]: any },
}

export const useMultiplayerStore = create(
    immer(
        combine(
            {
                peerStates: {} as Record<string, PeerState>,
                myState: { position: [0, 0, 0], rotation: [0, 0], appearance: {} } as PeerState,
            },
            (set, get) => {
                return {
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
                    reset: () => {
                        set(() => ({ peerStates: {}, myState: { position: [0, 0, 0], rotation: [0, 0], appearance: {} } }))
                    }
                }
            },
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

