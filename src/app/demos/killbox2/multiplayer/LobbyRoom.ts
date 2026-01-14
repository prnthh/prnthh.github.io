import { GameRoom, BaseAction } from "./GameRoom";

// Lobby-specific actions
export type LobbyAction = BaseAction & { type: 'chat' | 'matchmaking', payload: { message: string, senderName?: string, nonce?: string } };

// LobbyRoom - extends GameRoom with lobby-specific action types
export class LobbyRoom<TState = any> extends GameRoom<LobbyAction, TState> {
    constructor(
        appId: string,
        password: string,
        roomId: string,
        onStateUpdate: (peerId: string, state: TState) => void,
        onPeerJoin: (peerId: string) => void,
        onPeerLeave: (peerId: string) => void
    ) {
        super(appId, password, roomId, onStateUpdate, onPeerJoin, onPeerLeave)
    }
}
