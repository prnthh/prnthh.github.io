import { Room, joinRoom, selfId, pauseRelayReconnection } from "trystero/torrent";

// Base action type - all actions have a type
export type BaseAction = { type: string };

// GameRoom - base room for game sessions
export class GameRoom<TAction extends BaseAction = BaseAction, TState = any> {
    protected room: Room
    protected roomId: string

    protected sendState: (data: any, peerId?: string) => void
    protected sendAction: (data: any, peerId?: string) => void

    protected peers = new Set<string>()
    protected actionCallbacks = new Set<(action: TAction, peerId: string) => void>()
    protected joinCallbacks = new Set<(peerId: string) => void>()
    protected leaveCallbacks = new Set<(peerId: string) => void>()
    protected connectCallbacks = new Set<() => void>()
    protected isConnected = false
    protected isLeaving = false

    constructor(
        appId: string,
        password: string,
        roomId: string,
        onStateUpdate: (peerId: string, state: TState) => void,
        onPeerJoin: (peerId: string) => void,
        onPeerLeave: (peerId: string) => void
    ) {
        this.roomId = roomId
        this.room = joinRoom({ appId, password }, roomId)

        const [sendState, onState] = this.room.makeAction<any>('state')
        const [sendAction, onAction] = this.room.makeAction<any>('action')

        this.sendState = sendState
        this.sendAction = sendAction

        onState((data: any, peerId: string) => {
            if (this.isLeaving) return
            onStateUpdate(peerId, data as TState)
        })

        onAction((data: any, peerId: string) => {
            if (this.isLeaving) return
            const action = data as TAction
            this.actionCallbacks.forEach(cb => cb(action, peerId))
        })

        this.room.onPeerJoin((peerId: string) => {
            if (this.isLeaving) return
            this.peers.add(peerId)
            onPeerJoin(peerId)
            this.joinCallbacks.forEach(cb => cb(peerId))
        })
        this.room.onPeerLeave((peerId: string) => {
            if (this.isLeaving) return
            this.peers.delete(peerId)
            onPeerLeave(peerId)
            this.leaveCallbacks.forEach(cb => cb(peerId))
        })

        // Mark as connected after room is set up
        this.isConnected = true
    }

    broadcastState(state: TState, peerId?: string) {
        this.sendState(state, peerId)
    }

    broadcastAction(action: TAction, peerId?: string) {
        this.sendAction(action, peerId)
    }

    onAction(callback: (action: TAction, peerId: string) => void): () => void {
        this.actionCallbacks.add(callback)
        return () => { this.actionCallbacks.delete(callback) }
    }

    onPeerJoin(callback: (peerId: string) => void): () => void {
        this.joinCallbacks.add(callback)
        return () => { this.joinCallbacks.delete(callback) }
    }

    onPeerLeave(callback: (peerId: string) => void): () => void {
        this.leaveCallbacks.add(callback)
        return () => { this.leaveCallbacks.delete(callback) }
    }

    onConnect(callback: () => void): () => void {
        // If already connected, fire immediately and don't add to callbacks
        if (this.isConnected) {
            callback()
            return () => {}
        }
        this.connectCallbacks.add(callback)
        return () => { this.connectCallbacks.delete(callback) }
    }

    syncPeer(peerId: string, myState: TState) {
        this.sendState(myState, peerId)
    }

    async leave() {
        this.isLeaving = true
        this.isConnected = false
        try {
            pauseRelayReconnection()
            await this.room.leave()
        } catch {
            // Swallow disconnect errors (CONACK timeout, etc.)
        }
    }

    getInfo() {
        return { id: this.roomId, selfId }
    }

    getSelfId(): string {
        return selfId
    }

    getRoom(): Room {
        return this.room
    }

    getPeers(): string[] {
        return [...this.peers]
    }
}
