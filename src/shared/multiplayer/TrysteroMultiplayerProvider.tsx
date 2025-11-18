"use client";

import { useEffect, useRef, useState, createContext, useContext, useMemo } from "react"
import { joinRoom } from "trystero/torrent"
import { PeerState, useMultiplayerStore, useMyState, usePeerStates } from "@/shared/providers/MultiplayerStore"

// Hook to manage room joining/leaving
export const useRoom = (appId: string, roomId: string) => {
    const [room, setRoom] = useState<ReturnType<typeof joinRoom> | null>(null)

    useEffect(() => {
        const newRoom = joinRoom({ appId, password: undefined }, roomId)
        setRoom(newRoom)

        return () => {
            newRoom.leave()
            setRoom(null)
        }
    }, [appId, roomId])

    return room
}

// Create context for setMyState function
const MultiplayerContext = createContext<{
    setMyState: ((data: PeerState, peerId?: string) => void) | null
} | null>(null)

export const useMultiplayerProvider = () => {
    const context = useContext(MultiplayerContext)
    if (context === null) {
        throw new Error('useMultiplayerProvider must be used within MultiplayerProvider')
    }
    return context.setMyState
}

export default function MultiplayerProvider({ appId = 'pockit.world', roomId, children, debug = false }: { appId?: string, roomId: string, children: React.ReactNode, debug?: boolean }) {
    const [sendPlayerState, setSendPlayerState] = useState<((data: PeerState, peerId?: string) => void) | null>(null);

    // Use hooks for reactive state in debug UI
    const myState = useMyState()
    const peerStates = usePeerStates()

    const room = useRoom(appId, roomId)

    useEffect(() => {
        if (!room) return

        const [sendPlayerStateFn, getPlayerState] = room.makeAction('playerState')
        const { updatePeerState: handlePeerState, removePeer, setMyState } = useMultiplayerStore.getState()

        setSendPlayerState(() => (data: PeerState, peerId?: string) => {
            setMyState(data)
            sendPlayerStateFn(data, peerId)
        })

        // Listen for peer state updates with validation
        getPlayerState((data, peerId) => {
            if (
                data &&
                typeof data === 'object' &&
                Array.isArray((data as any).position) &&
                (data as any).position.length === 3 &&
                (data as any).position.every((n: any) => typeof n === 'number')
            ) {
                handlePeerState(peerId, data as PeerState)
            }
        })

        // Handle peer joining - send them our current state immediately
        room.onPeerJoin((peerId) => {
            // Send current state to the new peer
            const myState = useMultiplayerStore.getState().myState
            sendPlayerStateFn(myState, peerId)
        })

        // Handle peer leaving
        room.onPeerLeave((peerId) => {
            removePeer(peerId)
        })
    }, [room])

    useEffect(() => {
        return () => {
            useMultiplayerStore.getState().reset()
        }
    }, [])

    return <MultiplayerContext.Provider value={{ setMyState: sendPlayerState }}>
        {children}
        {debug && <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', fontSize: '12px', maxHeight: '90vh', overflowY: 'auto', zIndex: 9999 }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Multiplayer Debug Info</h3>
            <div><strong>My State:</strong></div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '5px 0 10px 0' }}>{JSON.stringify(myState, null, 2)}</pre>
            <div><strong>Peers ({Object.keys(peerStates).length}):</strong></div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '5px 0' }}>{JSON.stringify(peerStates, null, 2)}</pre>
        </div>
        }
    </MultiplayerContext.Provider>
}