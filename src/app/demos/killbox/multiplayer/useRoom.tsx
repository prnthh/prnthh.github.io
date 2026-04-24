"use client";

import { useEffect, useRef, useState } from "react"
// import { useGameStateStore } from "../core/GameStateStore"
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
    const roomRef = useRef<T | null>(null)
    const currentRoomIdRef = useRef<string | null>(null)

    useEffect(() => {
        // Track which roomId this effect is for
        const targetRoomId = roomId

        const setupRoom = async () => {
            // Leave old room first and wait for it
            if (roomRef.current) {
                const oldRoom = roomRef.current
                roomRef.current = null
                setRoom(null)
                await oldRoom.leave()
            }

            if (!targetRoomId) {
                currentRoomIdRef.current = null
                return
            }

            // Check if roomId changed while we were cleaning up
            if (targetRoomId !== roomId) return

            // Skip if already in this room
            if (currentRoomIdRef.current === targetRoomId) return

            // const store = useGameStateStore.getState()
            const newRoom = new RoomClass(
                appId, PASSWORD, targetRoomId,
                // (id: string, state: any) => syncEntity && store.updateEntity(id, state),
                // (id: string) => syncEntity && newRoom.syncPeer(id, useGameStateStore.getState().localEntity),
                // (id: string) => syncEntity && store.removeEntity(id)
            )

            if (newRoom instanceof FPSRoom && isHost) newRoom.becomeHost()

            currentRoomIdRef.current = targetRoomId
            roomRef.current = newRoom
            setRoom(newRoom)
        }

        setupRoom()

        return () => {
            if (roomRef.current) {
                const oldRoom = roomRef.current
                roomRef.current = null
                currentRoomIdRef.current = null
                oldRoom.leave()
            }
        }
    }, [roomId])

    return room
}

// Specific room hooks
export const useGameRoom = (gameId: string | null, appId?: string) =>
    useRoom(GameRoom, gameId, { appId })

export const useLobbyRoom = (lobbyId: string, appId?: string) =>
    useRoom(LobbyRoom, lobbyId, { appId, syncEntity: false })

export const useFPSRoom = (gameId: string | null, isHost?: boolean, appId?: string) =>
    useRoom(FPSRoom, gameId, { isHost, appId })