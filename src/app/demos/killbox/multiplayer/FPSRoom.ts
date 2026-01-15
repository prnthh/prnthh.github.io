import { GameRoom, BaseAction } from "./GameRoom";
import { selfId } from "trystero/torrent";

// FPS-specific actions
export type MoveAction = BaseAction & { type: 'move', payload: { message: string, senderName?: string, nonce?: string } }
export type ShootAction = BaseAction & { type: 'shoot', payload: { message: string, senderName?: string, nonce?: string } }
export type HostAnnounceAction = BaseAction & { type: 'host_announce', payload: { hostId: string } }
export type StateSyncAction = BaseAction & { type: 'state_sync', payload: { peerId: string, state: any } }
export type FPSAction = MoveAction | ShootAction | HostAnnounceAction | StateSyncAction;

// FPSRoom - authoritative host architecture
// Host maintains game state and syncs it to all clients
// Clients send updates only to host, host relays to others
export class FPSRoom<TState = any> extends GameRoom<FPSAction, TState> {
    private hostId: string | null = null;
    private peerStates = new Map<string, TState>();

    constructor(
        appId: string,
        password: string,
        roomId: string,
        onStateUpdate: (peerId: string, state: TState) => void,
        onPeerJoin: (peerId: string) => void,
        onPeerLeave: (peerId: string) => void
    ) {
        super(appId, password, roomId, 
            // Wrap state updates to track for authoritative sync
            (peerId, state) => {
                this.peerStates.set(peerId, state);
                onStateUpdate(peerId, state);
                
                // If we're the host, relay this state to all other clients
                if (this.isHost()) {
                    this.broadcastAction({ 
                        type: 'state_sync', 
                        payload: { peerId, state } 
                    });
                }
            },
            // When new peer joins, host sends full state dump
            (peerId) => {
                onPeerJoin(peerId);
                if (this.isHost()) {
                    this.syncAllStatesToPeer(peerId);
                }
            },
            // Clean up tracked state on leave
            (peerId) => {
                this.peerStates.delete(peerId);
                onPeerLeave(peerId);
            }
        );

        // Handle incoming actions
        this.onAction((action, fromPeerId) => {
            if (action.type === 'host_announce') {
                this.hostId = action.payload.hostId;
            } else if (action.type === 'state_sync') {
                // Receive synced state from host
                const { peerId, state } = action.payload;
                this.peerStates.set(peerId, state as TState);
                onStateUpdate(peerId, state as TState);
            }
        });
    }

    becomeHost() {
        this.hostId = selfId;
        // Track own state
        this.peerStates.set(selfId, {} as TState);
        // Announce to all peers
        this.broadcastAction({ 
            type: 'host_announce', 
            payload: { hostId: selfId } 
        });
    }

    isHost(): boolean {
        return this.hostId === selfId;
    }

    getHostId(): string | null {
        return this.hostId;
    }

    // Override to route through host and track state
    broadcastState(state: TState, peerId?: string) {
        // Track our own state
        this.peerStates.set(selfId, state);

        if (peerId) {
            this.sendState(state, peerId);
        } else if (this.isHost()) {
            // Host broadcasts directly and relays to all
            super.broadcastState(state);
        } else if (this.hostId) {
            // Non-host sends only to host
            this.sendState(state, this.hostId);
        } else {
            super.broadcastState(state);
        }
    }

    // Override to route through host
    broadcastAction(action: FPSAction, peerId?: string) {
        if (peerId) {
            this.sendAction(action, peerId);
        } else if (this.isHost()) {
            super.broadcastAction(action);
        } else if (this.hostId) {
            this.sendAction(action, this.hostId);
        } else {
            super.broadcastAction(action);
        }
    }

    // Host sends all known peer states to a new joiner
    private syncAllStatesToPeer(newPeerId: string) {
        for (const [peerId, state] of this.peerStates.entries()) {
            this.sendAction({ 
                type: 'state_sync', 
                payload: { peerId, state } 
            }, newPeerId);
        }
    }
}
