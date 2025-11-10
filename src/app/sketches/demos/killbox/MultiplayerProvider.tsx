import { useEffect, useRef } from "react"
import { joinRoom } from "trystero"
import { PeerState, useMultiplayerStore, useMyState, usePeerStates } from "./multiplayerStore"

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