"use client";

import { Canvas } from "@react-three/fiber";
import Player from "./Player";
import { useState, useRef, useEffect } from "react";
import FakeServer from "./FakeServer";
import { MapEntity } from "./MapEntity";
import { InventoryUI } from "./ui/Inventory";
import MapGrid, { generateHeight } from "./MapGrid";

const TILE_SIZE = 0.66; // Size of each tile in the tilemap
const GRID_WIDTH = 16;
const GRID_DEPTH = 16;

export default function Home() {
    // Store playerId in React state (not persisted)
    const [playerId] = useState(() => Math.random().toString(36).slice(2) + Date.now());

    // Generate map height data once in the parent (must be inside component)
    const [heightData] = useState(() => generateHeight(GRID_WIDTH, GRID_DEPTH));

    const [playerPos, setPlayerPos] = useState(FakeServer.getPlayerPos(playerId));
    // Remove targetPos, use currentAction
    // Get all players for rendering
    const [allPlayers, setAllPlayers] = useState(FakeServer.getAllPlayers());
    // Track drops for rendering
    const [drops, setDrops] = useState(FakeServer.getDrops());
    // Track map entities for rendering
    const [entities, setEntities] = useState<MapEntity[]>(FakeServer.getEntities());
    const [navPointer, setNavPointer] = useState<[number, number, number] | null>(null); // NavPointer world coords
    useEffect(() => {
        const interval = setInterval(() => {
            setPlayerPos(FakeServer.getPlayerPos(playerId));
            setAllPlayers({ ...FakeServer.getAllPlayers() });
            setDrops([...FakeServer.getDrops()]);
            setEntities([...FakeServer.getEntities()]);
        }, 200);
        return () => clearInterval(interval);
    }, [playerId]);

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

    // Click a map entity to extract resource
    const handleEntityClick = (entity: MapEntity) => {
        if (!entity.depleted && entity.resourceAmount > 0) {
            FakeServer.setAction(playerId, { type: "extractResource", entityId: entity.id });
        }
    };

    // Helper to get y height at (i, j)
    function getY(i: number, j: number) {
        if (i < 0 || j < 0 || i >= GRID_WIDTH || j >= GRID_DEPTH) return 0;
        const idx = j * GRID_WIDTH + i;
        return heightData[idx] * 0.08;
    }

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows>
                    {/* Use new MapGrid for terrain and tile rendering */}
                    <MapGrid
                        width={GRID_WIDTH}
                        depth={GRID_DEPTH}
                        tileSize={TILE_SIZE}
                        heightData={heightData}
                        onTileClick={({ i, j, x, y, z }) => {
                            FakeServer.setAction(playerId, { type: "walkTo", pos: [i, j] });
                            setNavPointer([x, getY(i, j), z]);
                        }}
                    />
                    {/* NavPointer debug cube */}
                    {navPointer && (
                        <mesh position={navPointer}>
                            <boxGeometry args={[0.18, 0.18, 0.18]} />
                            <meshStandardMaterial color="red" />
                        </mesh>
                    )}
                    {/* Render map entities (trees, ores) */}
                    {entities.map(entity => (
                        <mesh
                            key={entity.id}
                            position={[(entity.pos[0]) * TILE_SIZE, getY(entity.pos[0], entity.pos[1]), (entity.pos[1]) * TILE_SIZE]}
                            onClick={e => {
                                e.stopPropagation();
                                handleEntityClick(entity);
                            }}
                        >
                            {/* Use different geometry/material for trees vs ores */}
                            {entity.type.kind === "tree" ? (
                                <cylinderGeometry args={[0.13 * TILE_SIZE, 0.18 * TILE_SIZE, 0.5 * TILE_SIZE, 12]} />
                            ) : (
                                <sphereGeometry args={[0.18 * TILE_SIZE, 12, 12]} />
                            )}
                            <meshStandardMaterial color={
                                entity.depleted ? "gray" : entity.type.kind === "tree" ? "#228B22" : "#888888"
                            } opacity={entity.depleted ? 0.5 : 1} transparent />
                        </mesh>
                    ))}
                    {Object.entries(allPlayers).map(([id, state]) => (
                        <group key={id}>
                            <Player
                                key={id}
                                health={state.health}
                                position={[
                                    (state.pos[0]) * TILE_SIZE,
                                    getY(state.pos[0], state.pos[1]) + 0.3,
                                    (state.pos[1]) * TILE_SIZE
                                ]}
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
                            position={[(drop.pos[0]) * TILE_SIZE, getY(drop.pos[0], drop.pos[1]), (drop.pos[1]) * TILE_SIZE]}
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
                    <directionalLight
                        position={[5, 10, 5]}
                        intensity={1}
                        castShadow
                        shadow-mapSize-width={2048}
                        shadow-mapSize-height={2048}
                    />
                </Canvas>
            </div>
            <InventoryUI playerId={playerId} />
        </div>
    );
}
