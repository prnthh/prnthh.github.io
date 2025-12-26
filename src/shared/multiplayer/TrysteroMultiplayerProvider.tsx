"use client";

import { useEffect, useRef, useState, createContext, useContext, useMemo, useCallback } from "react"
import { joinRoom, getRelaySockets, pauseRelayReconnection, resumeRelayReconnection } from "trystero/torrent"
import { PeerState, useMultiplayerStore, useMyState, usePeerStates } from "@/shared/providers/MultiplayerStore"
import { selfId } from 'trystero'

// Hook to manage room joining/leaving
export const useRoom = (appId: string, roomId: string) => {
    const [room, setRoom] = useState<ReturnType<typeof joinRoom> | null>(null)

    useEffect(() => {
        const newRoom = joinRoom({
            appId,
            password: "pockitworld"
        }, roomId)
        setRoom(newRoom)

        console.log(`my peer ID is ${selfId}`)

        return () => {
            newRoom.leave()
            setRoom(null)
        }
    }, [appId, roomId])

    return room
}

// Action types for multiplayer events
export type PlayerAction =
    | { type: 'shoot' }
    | { type: 'hit', targetPeerId: string };

// Create context for setMyState function
const MultiplayerContext = createContext<{
    setMyState: ((data: PeerState, peerId?: string) => void) | null,
    sendAction: ((action: PlayerAction) => void) | null,
    onAction: ((callback: (action: PlayerAction, fromPeerId: string) => void) => () => void) | null,
} | null>(null)

export const useMultiplayerProvider = () => {
    const context = useContext(MultiplayerContext)
    if (context === null) {
        throw new Error('useMultiplayerProvider must be used within MultiplayerProvider')
    }
    return context.setMyState
}

export const useHitEvents = () => {
    const context = useContext(MultiplayerContext)
    if (context === null) {
        throw new Error('useHitEvents must be used within MultiplayerProvider')
    }
    return { sendAction: context.sendAction, onAction: context.onAction }
}

export default function MultiplayerProvider({ appId = 'pockit.world', roomId, children, debug = false }: { appId?: string, roomId: string, children: React.ReactNode, debug?: boolean }) {
    const [sendPlayerState, setSendPlayerState] = useState<((data: PeerState, peerId?: string) => void) | null>(null);
    const [sendActionFn, setSendActionFn] = useState<((action: PlayerAction) => void) | null>(null);
    const actionCallbacksRef = useRef<Set<(action: PlayerAction, fromPeerId: string) => void>>(new Set());

    const room = useRoom(appId, roomId)

    useEffect(() => {
        if (!room) return

        const [sendPlayerStateFn, getPlayerState] = room.makeAction('playerState')
        const [sendActionRaw, getActionRaw] = room.makeAction('playerAction')
        const { updatePeerState: handlePeerState, removePeer, setMyState } = useMultiplayerStore.getState()

        setSendPlayerState(() => (data: PeerState, peerId?: string) => {
            setMyState(data)
            sendPlayerStateFn(data, peerId)
        })

        // Set up generic action sender
        setSendActionFn(() => (action: PlayerAction) => {
            sendActionRaw(action)
        })

        // Listen for player action events
        getActionRaw((data, peerId) => {
            const action = data as PlayerAction
            actionCallbacksRef.current.forEach(callback => callback(action, peerId))
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

    const onAction = useCallback((callback: (action: PlayerAction, fromPeerId: string) => void) => {
        actionCallbacksRef.current.add(callback)
        return () => {
            actionCallbacksRef.current.delete(callback)
        }
    }, [])

    const contextValue = useMemo(() => ({
        setMyState: sendPlayerState,
        sendAction: sendActionFn,
        onAction,
    }), [sendPlayerState, sendActionFn, onAction])

    return <MultiplayerContext.Provider value={contextValue}>
        {children}
        {debug && <DebugPanel />}
    </MultiplayerContext.Provider>
}

// Separate component for debug UI to avoid re-rendering the provider
const DebugPanel = () => {
    const myState = useMyState()
    const peerStates = usePeerStates()

    return (
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', fontSize: '12px', maxHeight: '90vh', overflowY: 'auto', zIndex: 9999 }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Multiplayer Debug Info</h3>
            <div><strong>My State:</strong></div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '5px 0 10px 0' }}>{JSON.stringify(myState, null, 2)}</pre>
            <div><strong>Peers ({Object.keys(peerStates).length}):</strong></div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '5px 0' }}>{JSON.stringify(peerStates, null, 2)}</pre>
        </div>
    )
}