import { useEffect, useRef } from "react"
import { joinRoom } from "trystero"
import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { immer } from "zustand/middleware/immer"

export type PeerState = {
    position: [number, number, number],
    rotation: [number, number],
    appearance?: { [key: string]: any },
}

const useMultiplayerStore = create(
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

// Export actions to send data to peers
let sendPlayerStateAction: ((data: PeerState, peerId?: string) => void) | null = null

export const setMyState = (state: PeerState) => {
    const { setMyState } = useMultiplayerStore.getState()
    setMyState(state)
    // Auto-broadcast to all peers
    if (sendPlayerStateAction) {
        sendPlayerStateAction(state)
    }
}

export default function MultiplayerProvider({ appId = 'pockit.world', roomId, children, debug = false }: { appId?: string, roomId: string, children: React.ReactNode, debug?: boolean }) {
    const sendPlayerStateRef = useRef<((data: PeerState, peerId?: string) => void) | null>(null)

    // Use hooks for reactive state in debug UI
    const myState = useMyState()
    const peerStates = usePeerStates()

    useEffect(() => {
        const room = joinRoom({ appId, password: undefined }, roomId)

        const [sendPlayerStateFn, getPlayerState] = room.makeAction('playerState')

        sendPlayerStateRef.current = sendPlayerStateFn
        sendPlayerStateAction = sendPlayerStateFn

        const { updatePeerState, removePeer, setMyState } = useMultiplayerStore.getState()

        // Listen for peer state updates with validation
        getPlayerState((data, peerId) => {
            if (
                data &&
                typeof data === 'object' &&
                Array.isArray((data as any).position) &&
                (data as any).position.length === 3 &&
                (data as any).position.every((n: any) => typeof n === 'number')
            ) {
                updatePeerState(peerId, data as PeerState)
            }
        })

        // Handle peer joining - send them our current state immediately
        room.onPeerJoin((peerId) => {
            if (debug) console.log('Peer joined:', peerId)

            // Send current state to the new peer
            const myState = useMultiplayerStore.getState().myState
            sendPlayerStateFn(myState, peerId)
        })

        // Handle peer leaving
        room.onPeerLeave((peerId) => {
            if (debug) console.log('Peer left:', peerId)
            removePeer(peerId)
        })

        return () => {
            room.leave()
            sendPlayerStateAction = null
            sendPlayerStateRef.current = null
            useMultiplayerStore.getState().reset()
        }
    }, [appId, roomId, debug])

    return <>{children}
        {debug && <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', fontSize: '12px', maxHeight: '90vh', overflowY: 'auto', zIndex: 9999 }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Multiplayer Debug Info</h3>
            <div><strong>My State:</strong></div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '5px 0 10px 0' }}>{JSON.stringify(myState, null, 2)}</pre>
            <div><strong>Peers ({Object.keys(peerStates).length}):</strong></div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '5px 0' }}>{JSON.stringify(peerStates, null, 2)}</pre>
        </div>
        }
    </>
}