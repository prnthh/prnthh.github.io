import { Room, joinRoom, selfId } from "trystero/torrent"

export type PlayerAction =
    | { type: 'shoot' }
    | { type: 'hit', targetPeerId: string }
    | { type: 'syncClock', objectId: string, startTime: number };

export type RoomType = 'lobby' | 'match'

export class GameRoom {
    private room: Room
    private roomType: RoomType
    private roomId: string
    
    private sendState: (data: any, peerId?: string) => void
    private sendAction: (data: PlayerAction, peerId?: string) => void
    
    private actionCallbacks = new Set<(action: PlayerAction, peerId: string) => void>()
    private syncedClocks = new Map<string, number>()
    private pendingClocks = new Set<string>()

    constructor(
        appId: string,
        password: string,
        roomId: string,
        roomType: RoomType,
        onStateUpdate: (peerId: string, state: any) => void,
        onPeerJoin: (peerId: string) => void,
        onPeerLeave: (peerId: string) => void
    ) {
        this.roomId = roomId
        this.roomType = roomType
        this.room = joinRoom({ appId, password }, roomId)

        // Set up state and action channels
        const [sendState, onState] = this.room.makeAction<any>('state')
        const [sendAction, onAction] = this.room.makeAction<PlayerAction>('action')
        
        this.sendState = sendState
        this.sendAction = sendAction

        // Handle incoming state updates
        onState((data: any, peerId: string) => {
            const d = data as any
            if (d?.position?.length === 3 && d.position.every((n: any) => typeof n === 'number')) {
                onStateUpdate(peerId, d)
            }
        })

        // Handle incoming actions
        onAction((data: any, peerId: string) => {
            const action = data as PlayerAction
            if (action.type === 'syncClock') {
                const { objectId, startTime } = action
                const existing = this.syncedClocks.get(objectId)
                if (!existing || startTime < existing) {
                    this.syncedClocks.set(objectId, startTime)
                    this.pendingClocks.delete(objectId)
                    if (existing) this.sendAction({ type: 'syncClock', objectId, startTime }) // crdt convergence
                }
            }
            this.actionCallbacks.forEach(cb => cb(action, peerId))
        })

        // Set up peer join/leave handlers
        this.room.onPeerJoin(onPeerJoin)
        this.room.onPeerLeave(onPeerLeave)
    }

    // Send state to a specific peer or all peers
    broadcastState(state: any, peerId?: string) {
        this.sendState(state, peerId)
    }

    // Send action to a specific peer or all peers
    broadcastAction(action: PlayerAction, peerId?: string) {
        this.sendAction(action, peerId)
    }

    // Subscribe to actions from other players
    onAction(callback: (action: PlayerAction, peerId: string) => void): () => void {
        this.actionCallbacks.add(callback)
        return () => { this.actionCallbacks.delete(callback) }
    }

    // Sync peer on join with current state and clocks
    syncPeer(peerId: string, myState: any) {
        this.sendState(myState, peerId)
        if (this.roomType === 'match') {
            this.syncedClocks.forEach((startTime, objectId) =>
                this.sendAction({ type: 'syncClock', objectId, startTime }, peerId)
            )
        }
    }

    // Get synced clock value
    getSyncedClock(id: string): number | null {
        return this.syncedClocks.get(id) ?? null
    }

    // Initialize a synced clock
    initSyncedClock(id: string) {
        if (this.roomType !== 'match') return // Only match room has synced clocks
        
        if (this.syncedClocks.has(id) || this.pendingClocks.has(id)) return
        this.pendingClocks.add(id)
        
        setTimeout(() => {
            if (!this.syncedClocks.has(id)) {
                const startTime = Date.now()
                this.syncedClocks.set(id, startTime)
                this.sendAction({ type: 'syncClock', objectId: id, startTime })
            }
            this.pendingClocks.delete(id)
        }, 1000)
    }

    // Leave the room
    async leave() {
        await this.room.leave()
    }

    // Get room info
    getInfo() {
        return {
            type: this.roomType,
            id: this.roomId,
            selfId: selfId
        }
    }

    // Get self peer ID
    getSelfId(): string {
        return selfId
    }

    // Get underlying trystero room
    getRoom(): Room {
        return this.room
    }
}
