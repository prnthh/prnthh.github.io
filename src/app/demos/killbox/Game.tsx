"use client";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import { useLobbyRoom, useFPSRoom } from "./multiplayer/useRoom";
import ChatUI from "./ChatUI";
import { useState, useEffect } from "react";
import { useEntities, useGameStateStore } from "./core/GameStateStore";
import { GameCanvas, Prefab, PrefabRoot } from "react-three-game";
import MapPicker from "./MapPicker";
import killbox from "../../sketches/tools/prefabeditor/samples/killbox.json";
import killboxlobby from "../../sketches/tools/prefabeditor/samples/killboxlobby.json";
import { Physics } from "@react-three/rapier";
import { FirstPersonController } from "@/app/react-three-controller";
import { PedSpawner } from "../mechanics/Game";

export default function GameWrapper({ onCanvasReady }: { onCanvasReady?: () => void }) {
    const [gameId, setGameId] = useState<string | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [offline, setOffline] = useState(false);
    const lobby = useLobbyRoom("killbox2-lobby")
    const game = useFPSRoom(gameId, isHost)
    const playing = !!gameId || offline;
    const [currentMap, setCurrentMap] = useState<Prefab>(killbox);

    useEffect(() => {
        onCanvasReady && onCanvasReady();

        if (playing)
            setCurrentMap(killbox);
        else
            setCurrentMap(killboxlobby);
    }, [playing]);

    // When someone joins the lobby and we're the host, send them the game info
    useEffect(() => {
        if (!lobby || !isHost || !gameId) return;

        const unsubscribe = lobby.onPeerJoin((peerId: string) => {
            // Send the game ID to the newly joined peer
            lobby.broadcastAction({
                type: 'matchmaking',
                payload: { message: gameId }
            });
        });

        return unsubscribe;
    }, [lobby, isHost, gameId]);

    const hostGame = () => {
        const newGameId = `killbox2-game-${Math.floor(Math.random() * 10000)}`
        setGameId(newGameId)
        setIsHost(true) // Mark this player as the host

        // Broadcast game ID to lobby so others can join
        lobby?.broadcastAction({
            type: 'matchmaking',
            payload: { message: `${newGameId}` }
        });
    }

    const playOffline = () => {
        setOffline(true);
    };

    return (
        <Controls>
            <div className="items-center justify-items-center min-h-screen select-none">
                <MapPicker onMapChange={setCurrentMap} />

                <div className="w-full" style={{ height: "100vh" }}>
                    <GameCanvas>
                        <ambientLight intensity={0.5} />
                        {/* <OrbitControls makeDefault /> */}
                        <Physics>
                            <color attach="background" args={['#b5e9ff']} />
                            <PrefabRoot data={currentMap} />

                            <FirstPersonController
                            // forwardRef={(refs) => {
                            //     rigidBodyRef.current = refs.rigidBodyRef.current;
                            //     bodyMeshRef.current = refs.meshref.current;
                            //     cameraRigRef.current = refs.cameraRigRef.current;
                            //     if (playerRef) playerRef.current = refs.meshref.current;
                            // }}
                            // onFire={handleFire}
                            />

                            <PedSpawner position={[0, 0, -3]} />
                        </Physics>
                    </GameCanvas>
                </div>
                <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                    {lobby && <ChatUI room={lobby} label="Lobby" onJoinGame={setGameId} />}
                    {game && gameId && <ChatUI room={game} label={gameId + (isHost ? " (Host)" : "")} />}
                    {!playing && !gameId && lobby && (
                        <>
                            <button
                                className="px-2 py-1 bg-blue-600 text-white rounded"
                                onClick={hostGame}
                            >
                                Host Game
                            </button>
                            <button
                                className="px-2 py-1 bg-green-600 text-white rounded"
                                onClick={playOffline}
                            >
                                Play Offline
                            </button>
                        </>
                    )}
                    {playing && (
                        <button
                            className="px-2 py-1 bg-red-600 text-white rounded"
                            onClick={() => {
                                setOffline(false);
                                setGameId(null);
                                setIsHost(false);
                            }}
                        >
                            {offline ? "Exit Offline" : "Leave Game"}
                        </button>
                    )}

                    {playing && <DummyGame game={game} />}
                </div>
            </div>
        </Controls>
    );
}

const DummyGame = ({ game }: { game: ReturnType<typeof useFPSRoom> | null }) => {
    const localEntity = useGameStateStore((state) => state.localEntity)
    const setLocalEntity = useGameStateStore((state) => state.setLocalEntity)
    const entities = useEntities()

    // Initialize local entity
    useEffect(() => {
        setLocalEntity({
            position: [0, 0, 0],
            rotation: [0, 0],
            data: { name: "Player_" + Math.floor(Math.random() * 1000) }
        })
    }, [setLocalEntity])

    // Simulate movement and send entity state at regular intervals
    useEffect(() => {
        // const interval = setInterval(() => {
        // Get fresh state from store
        const currentEntity = useGameStateStore.getState().localEntity;
        const currentPos = currentEntity.position;

        // Simulate movement by updating position
        const newPos: [number, number, number] = [
            currentPos[0] + (Math.random() - 0.5) * 0.1,
            currentPos[1],
            currentPos[2] + (Math.random() - 0.5) * 0.1
        ];

        const updatedEntity = {
            ...currentEntity,
            position: newPos
        };

        setLocalEntity(updatedEntity);

        // Broadcast the updated state only if connected to a game
        if (game) {
            game.broadcastState(updatedEntity);
        }
        // }, 100); // Send updates every 100ms

        // return () => clearInterval(interval);
    }, [game, setLocalEntity]);

    return (
        <div className="text-white">
            <div className="mb-4">
                <h3 className="text-lg font-bold">My State:</h3>
                <div className="text-xs w-[280px] break-words">{JSON.stringify(localEntity)}</div>
            </div>
            <div>
                <h3 className="text-lg font-bold">Other Players ({Object.keys(entities).length}):</h3>
                <div className="text-xs w-[280px] break-words">{JSON.stringify(entities)}</div>
            </div>
        </div>
    );
}