"use client";

import { useEffect, useRef, createContext, useContext, useMemo, useState } from "react"
import { PeerState, useMultiplayerStore, useMyState, usePeerStates } from "@/shared/providers/MultiplayerStore"
import { GameRoom, RoomType, PlayerAction } from "./GameRoom"

const MultiplayerContext = createContext<{
    setMyState: (data: PeerState) => void,
    sendAction: (action: PlayerAction) => void,
    onAction: (cb: (action: PlayerAction, peerId: string) => void) => () => void,
    getSyncedClock: (id: string) => number | null,
    initSyncedClock: (id: string) => void,
} | null>(null)

export const useMultiplayerProvider = () => useContext(MultiplayerContext)?.setMyState ?? null
export const useGameEvents = () => {
    const c = useContext(MultiplayerContext)
    return { sendGameEvent: c?.sendAction ?? null, onGameEvent: c?.onAction ?? null }
}
export const useSyncedClock = () => {
    const c = useContext(MultiplayerContext)
    return { getSyncedClock: c?.getSyncedClock ?? null, initSyncedClock: c?.initSyncedClock ?? null }
}

export default function MultiplayerProvider({ appId = 'pockit.world', roomId, roomType = 'lobby', children, debug = false }: { appId?: string, roomId: string, roomType?: RoomType, children: React.ReactNode, debug?: boolean }) {
    const gameRoomRef = useRef<GameRoom | null>(null)
    const actionCallbacksRef = useRef<Set<(action: PlayerAction, peerId: string) => void>>(new Set())

    useEffect(() => {
        const store = useMultiplayerStore.getState()

        const gameRoom = new GameRoom(
            appId,
            "pockitworld",
            roomId,
            roomType,
            (peerId, state) => store.updatePeerState(peerId, state),
            (peerId) => gameRoom.syncPeer(peerId, store.myState),
            (peerId) => store.removePeer(peerId)
        )

        gameRoomRef.current = gameRoom

        // Subscribe to game room actions and forward to local callbacks
        const unsubscribe = gameRoom.onAction((action, peerId) => {
            actionCallbacksRef.current.forEach(cb => cb(action, peerId))
        })

        return () => {
            unsubscribe()
            gameRoom.leave()
            gameRoomRef.current = null
            store.reset()
        }
    }, [appId, roomId, roomType])

    const contextValue = useMemo(() => ({
        setMyState: (data: PeerState) => {
            useMultiplayerStore.getState().setMyState(data)
            gameRoomRef.current?.broadcastState(data)
        },
        sendAction: (action: PlayerAction) => gameRoomRef.current?.broadcastAction(action),
        onAction: (cb: (action: PlayerAction, peerId: string) => void) => {
            actionCallbacksRef.current.add(cb)
            return () => { actionCallbacksRef.current.delete(cb) }
        },
        getSyncedClock: (id: string) => gameRoomRef.current?.getSyncedClock(id) ?? null,
        initSyncedClock: (id: string) => gameRoomRef.current?.initSyncedClock(id),
    }), [])

    return <MultiplayerContext.Provider value={contextValue}>
        {children}
        {debug && <DebugPanel roomId={roomId} />}
    </MultiplayerContext.Provider>
}

// Generic recursive JSON renderer - renders values as inline tabs
const renderJson = (value: any, depth = 0, keyPath = ''): React.ReactNode => {
    if (value === null || value === undefined) return null

    if (Array.isArray(value)) {
        return <span style={{ display: 'inline-block', background: '#444', margin: '1px', fontSize: '9px' }}>
            [{value.map((v, i) => typeof v === 'number' ? v.toFixed(2) : JSON.stringify(v)).join(', ')}]
        </span>
    }

    if (typeof value === 'object') {
        return <>{Object.entries(value).map(([k, v], i) => (
            <span key={keyPath + k} style={{ display: 'inline-block', background: '#333', margin: '1px', fontSize: '9px' }}>
                {k}: {renderJson(v, depth + 1, keyPath + k)}
            </span>
        ))}</>
    }

    return <span>{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
}

// Separate component for debug UI to avoid re-rendering the provider
const DebugPanel = ({ roomId }: { roomId: string }) => {
    const myState = useMyState()
    const peerStates = usePeerStates()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Don't render until client-side hydration is complete
    if (!mounted) return null

    return (
        <div className="absolute top-2 right-2 font-xs z-20 p-1 w-[300px] text-white bg-black/75">
            <div style={{ marginBottom: '4px', opacity: 0.6 }}> {roomId} </div>
            <textarea readOnly className="w-full text-xs" value="logs" />
            {/* {selfId} */}
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>{renderJson(myState)}</div>
            {Object.keys(peerStates).length > 0 && (
                <>
                    <div style={{ marginTop: '8px', marginBottom: '4px', opacity: 0.6 }}>Peers ({Object.keys(peerStates).length})</div>
                    {Object.entries(peerStates).map(([peerId, state]) => (
                        <div key={peerId} style={{ marginTop: '6px' }}>
                            <div style={{ fontSize: '8px', opacity: 0.5, marginBottom: '2px' }}>{peerId.slice(0, 8)}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>{renderJson(state, 0, peerId)}</div>
                        </div>
                    ))}
                </>
            )}
        </div>
    )
}