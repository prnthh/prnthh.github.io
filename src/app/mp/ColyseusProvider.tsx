import React, { createContext, useContext, useEffect } from 'react';
import { Room, Client } from 'colyseus.js';
import { MyRoomState } from '../../../server/src/rooms/schema/MyRoomState';

type RoomContextType = {
    isConnecting: boolean;
    isConnected: boolean;
    room: Room<MyRoomState> | undefined;
    join: () => void | Promise<void>;
    joinError: boolean;
    state: ReturnType<MyRoomState['toJSON']> | undefined;
    offlineState: any;
    setOfflineState: React.Dispatch<React.SetStateAction<any>>;
};

export const RoomContext = createContext<RoomContextType>({
    isConnecting: false,
    isConnected: false,
    room: undefined,
    join: () => { },
    joinError: false,
    state: undefined,
    offlineState: undefined,
    setOfflineState: () => { },
});

export function useRoom() { return useContext(RoomContext); }

let room!: Room<MyRoomState>;

//
// Workaround for React.StrictMode, to avoid multiple join requests
//
let hasActiveJoinRequest: boolean = false;

const defaultState = {
    players: {
        offline: {
            id: "offline",
            position: { x: 0, y: 0, z: 0 },
        }
    }
}

export default function ColyseusProvider({ serverUrl = "http://localhost:2567", children }: { serverUrl?: string, children: React.ReactNode }) {
    // const [searchParams, _] = useSearchParams();
    const [client, setClient] = React.useState<any>(undefined);
    const [joinError, setJoinError] = React.useState(false);
    const [isConnecting, setIsConnecting] = React.useState(false);
    const [isConnected, setIsConnected] = React.useState(false);
    const [state, setState] = React.useState<ReturnType<MyRoomState['toJSON']> | undefined>(undefined);
    const [offlineState, setOfflineState] = React.useState<any>(defaultState);

    useEffect(() => {
        const client = new Client(serverUrl);
        setClient(client);
    }, []);

    const join = async () => {
        if (hasActiveJoinRequest) { return; }
        hasActiveJoinRequest = true;

        setIsConnecting(true);

        try {
            room = await client.joinOrCreate("my_room");

        } catch (e) {
            setJoinError(true);
            setIsConnecting(false);
            return;

        } finally {
            hasActiveJoinRequest = false;
        }

        //
        // cache reconnection token, if user goes back to this URL, we can try re-connect to the room.
        // TODO: do not cache reconnection token if user is spectating
        //
        localStorage.setItem("reconnection", JSON.stringify({
            token: room.reconnectionToken,
            roomId: room.roomId,
        }));

        room.onStateChange((state) => setState(state.toJSON()));
        room.onLeave(() => setIsConnected(false));

        setIsConnected(true);
    };

    React.useEffect(() => {
        if (!client) return;
        // join();
    }, [client]);

    return (
        <RoomContext.Provider value={{ isConnecting, isConnected, room, join, joinError, state, offlineState, setOfflineState }}>
            {children}
        </RoomContext.Provider>
    );
}