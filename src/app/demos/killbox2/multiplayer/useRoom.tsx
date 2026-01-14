"use client";

import { useEffect, useState } from "react"
import { useGameStateStore } from "../core/GameStateStore"
import { LobbyRoom } from "./LobbyRoom"
import { GameRoom } from "./GameRoom"
import { FPSRoom } from "./FPSRoom"

const APP_ID = 'pockit.world'
const PASSWORD = 'pockitworld'

// Generic room hook factory
function useRoom<T extends GameRoom<any, any>>(
    RoomClass: new (...args: any[]) => T,
    roomId: string | null,
    options: { isHost?: boolean, appId?: string, syncEntity?: boolean } = {}
): T | null {
    const { isHost = false, appId = APP_ID, syncEntity = true } = options
    const [room, setRoom] = useState<T | null>(null)

    useEffect(() => {
        if (!roomId) {
            setRoom(null)
            return
        }

        const store = useGameStateStore.getState()

        const newRoom = new RoomClass(
            appId,
            PASSWORD,
            roomId,
            (entityId: string, state: any) => syncEntity && store.updateEntity(entityId, state),
            (entityId: string) => syncEntity && newRoom.syncPeer(entityId, useGameStateStore.getState().localEntity),
            (entityId: string) => syncEntity && store.removeEntity(entityId)
        )

        // Handle host setup for FPS rooms
        if (newRoom instanceof FPSRoom && isHost) {
            newRoom.becomeHost()
        }

        setRoom(newRoom)

        return () => {
            newRoom.leave()
            setRoom(null)
        }
    }, [roomId, isHost, appId, syncEntity])

    return room
}

// Specific room hooks
export const useGameRoom = (gameId: string | null, appId?: string) =>
    useRoom(GameRoom, gameId, { appId })

export const useLobbyRoom = (lobbyId: string, appId?: string) =>
    useRoom(LobbyRoom, lobbyId, { appId, syncEntity: false })

export const useFPSRoom = (gameId: string | null, isHost?: boolean, appId?: string) =>
    useRoom(FPSRoom, gameId, { isHost, appId })