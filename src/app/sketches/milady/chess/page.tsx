"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import Tile from "./Tile";
import Player from "./Player";
import { useState, useRef, useEffect } from "react";
import FakeServer from "./FakeServer";

const TILE_SIZE = 0.66; // Size of each tile in the tilemap

export default function Home() {
    // Store playerId in React state (not persisted)
    const [playerId] = useState(() => Math.random().toString(36).slice(2) + Date.now());

    const [playerPos, setPlayerPos] = useState(FakeServer.getPlayerPos(playerId));
    // Remove targetPos, use currentAction
    // Get all players for rendering
    const [allPlayers, setAllPlayers] = useState(FakeServer.getAllPlayers());
    // Track drops for rendering
    const [drops, setDrops] = useState(FakeServer.getDrops());
    useEffect(() => {
        const interval = setInterval(() => {
            setPlayerPos(FakeServer.getPlayerPos(playerId));
            setAllPlayers({ ...FakeServer.getAllPlayers() });
            setDrops([...FakeServer.getDrops()]);
        }, 200);
        return () => clearInterval(interval);
    }, [playerId]);

    // Click a tile to walk to it
    const handleTileClick = (i: number, j: number) => {
        FakeServer.setAction(playerId, { type: "walkTo", pos: [i, j] });
    };

    // Click a player to attack them
    const handlePlayerClick = (targetId: string) => {
        if (targetId !== playerId) {
            FakeServer.setAction(playerId, { type: "attack", targetId });
        }
    };

    // Click a drop to pick it up
    const handleDropClick = (dropId: string) => {
        FakeServer.setAction(playerId, { type: "pickupDrop", dropId });
    };

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas>
                    {/* todo optimise tile drawing so it doesnt refresh every tick */}
                    {FakeServer.getTilemap().map((row: number[], i: number) =>
                        row.map((tile: number, j: number) => (
                            <Tile
                                key={`tile-${i}-${j}`}
                                position={[(i - 4.5) * TILE_SIZE, -2 * TILE_SIZE, (j - 4.5) * TILE_SIZE]}
                                type={tile}
                                onClick={() => handleTileClick(i, j)}
                            />
                        ))
                    )}
                    {Object.entries(allPlayers).map(([id, state]) => (
                        <group key={id}>
                            <Player
                                key={id}
                                health={state.health}
                                position={[(state.pos[0] - 4.5) * TILE_SIZE, -1.5 * TILE_SIZE, (state.pos[1] - 4.5) * TILE_SIZE]}
                                color={id === playerId ? "orange" : "blue"}
                                onClick={e => {
                                    e.stopPropagation();
                                    handlePlayerClick(id);
                                }}
                            />
                        </group>
                    ))}
                    {/* Render drops */}
                    {drops.map(drop => (
                        <mesh
                            key={drop.id}
                            position={[(drop.pos[0] - 4.5) * TILE_SIZE, -1.8 * TILE_SIZE, (drop.pos[1] - 4.5) * TILE_SIZE]}
                            onClick={e => {
                                e.stopPropagation();
                                handleDropClick(drop.id);
                            }}
                        >
                            <sphereGeometry args={[0.18 * TILE_SIZE, 16, 16]} />
                            <meshStandardMaterial color={drop.itemKey === 'bone' ? 'white' : 'yellow'} />
                        </mesh>
                    ))}
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                </Canvas>
            </div>
        </div>
    );
}
