"use client";

import { useEffect, useRef, createContext, useContext, useMemo } from "react"
import { joinRoom } from "trystero/torrent"
import { PeerState, useMultiplayerStore, useMyState, usePeerStates } from "@/shared/providers/MultiplayerStore"
import { selfId } from 'trystero'

export type PlayerAction =
    | { type: 'shoot' }
    | { type: 'hit', targetPeerId: string }
    | { type: 'syncClock', objectId: string, startTime: number };

type RoomActions = {
    sendState: (data: PeerState, peerId?: string) => void
    sendAction: (action: PlayerAction, peerId?: string) => void
}

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

export default function MultiplayerProvider({ appId = 'pockit.world', roomId, children, debug = false }: { appId?: string, roomId: string, children: React.ReactNode, debug?: boolean }) {
    const actionsRef = useRef<RoomActions | null>(null)
    const actionCallbacksRef = useRef<Set<(action: PlayerAction, peerId: string) => void>>(new Set())
    const syncedClocksRef = useRef<Map<string, number>>(new Map())
    const pendingClocksRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        const room = joinRoom({ appId, password: "pockitworld" }, roomId)
        const [sendState, onState] = room.makeAction('state')
        const [sendAction, onAction] = room.makeAction('action')
        const store = useMultiplayerStore.getState()

        console.log(`peer ID: ${selfId}`)

        // Store actions in ref immediately - no race condition
        actionsRef.current = { sendState, sendAction }

        const syncPeer = (peerId: string) => {
            sendState(store.myState, peerId)
            syncedClocksRef.current.forEach((startTime, objectId) =>
                sendAction({ type: 'syncClock', objectId, startTime }, peerId)
            )
        }

        onState((data, peerId) => {
            const d = data as any
            if (d?.position?.length === 3 && d.position.every((n: any) => typeof n === 'number')) {
                store.updatePeerState(peerId, d as PeerState)
            }
        })

        onAction((data, peerId) => {
            const action = data as PlayerAction
            if (action.type === 'syncClock') {
                const { objectId, startTime } = action
                const existing = syncedClocksRef.current.get(objectId)
                if (!existing || startTime < existing) {
                    syncedClocksRef.current.set(objectId, startTime)
                    pendingClocksRef.current.delete(objectId)
                    if (existing) sendAction({ type: 'syncClock', objectId, startTime }) // crdt convergence
                }
            }
            actionCallbacksRef.current.forEach(cb => cb(action, peerId))
        })

        room.onPeerJoin(syncPeer)
        room.onPeerLeave(store.removePeer)

        return () => {
            room.leave()
            actionsRef.current = null
            store.reset()
        }
    }, [appId, roomId])

    const contextValue = useMemo(() => ({
        setMyState: (data: PeerState) => {
            useMultiplayerStore.getState().setMyState(data)
            actionsRef.current?.sendState(data)
        },
        sendAction: (action: PlayerAction) => actionsRef.current?.sendAction(action),
        onAction: (cb: (action: PlayerAction, peerId: string) => void) => {
            actionCallbacksRef.current.add(cb)
            return () => { actionCallbacksRef.current.delete(cb) }
        },
        getSyncedClock: (id: string) => syncedClocksRef.current.get(id) ?? null,
        initSyncedClock: (id: string) => {
            if (syncedClocksRef.current.has(id) || pendingClocksRef.current.has(id)) return
            pendingClocksRef.current.add(id)
            setTimeout(() => {
                if (!syncedClocksRef.current.has(id)) {
                    const startTime = Date.now()
                    syncedClocksRef.current.set(id, startTime)
                    actionsRef.current?.sendAction({ type: 'syncClock', objectId: id, startTime })
                }
                pendingClocksRef.current.delete(id)
            }, 1000)
        },
    }), [])

    return <MultiplayerContext.Provider value={contextValue}>
        {children}
        {debug && <DebugPanel />}
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
const DebugPanel = () => {
    const myState = useMyState()
    const peerStates = usePeerStates()

    return (
        <div style={{ position: 'absolute', top: 10, right: 10, background: '#000c', color: '#fff', padding: '8px', fontSize: '9px', maxHeight: '90vh', overflowY: 'auto', zIndex: 20, maxWidth: '300px' }}>
            <div style={{ marginBottom: '4px', opacity: 0.6 }}>Local</div>
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