"use client";

import { Canvas } from "@react-three/fiber";
import Player from "./Player";
import { useState, useRef, useEffect } from "react";
import FakeServer from "./FakeServer";
import { MapEntity, MapEntityMesh } from "./MapEntity";
import { InventoryUI } from "./ui/Inventory";
import MapGrid, { generateHeight } from "./MapGrid";

const TILE_SIZE = 0.66; // Size of each tile in the tilemap
const GRID_WIDTH = 16;
const GRID_DEPTH = 16;

export default function Home() {
    const [playerId] = useState(() => Math.random().toString(36).slice(2) + Date.now());

    const [heightData] = useState(() => generateHeight(GRID_WIDTH, GRID_DEPTH));

    const [playerPos, setPlayerPos] = useState(FakeServer.getPlayerPos(playerId));
    const [allPlayers, setAllPlayers] = useState(FakeServer.getAllPlayers());
    const [drops, setDrops] = useState(FakeServer.getDrops());
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
            FakeServer.setGoal(playerId, { type: "attack", targetId });
        }
    };

    // Click a drop to pick it up
    const handleDropClick = (dropId: string) => {
        FakeServer.setGoal(playerId, { type: "pickupDrop", dropId });
    };

    // Click a map entity to extract resource
    const handleEntityClick = (entity: MapEntity) => {
        if (!entity.depleted && entity.resourceAmount > 0) {
            FakeServer.setGoal(playerId, { type: "extractResource", entityId: entity.id });
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
                            FakeServer.setGoal(playerId, { type: "walkTo", pos: [i, j] });
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
                        <MapEntityMesh
                            key={entity.id}
                            entity={entity}
                            position={[
                                (entity.pos[0]) * TILE_SIZE,
                                getY(entity.pos[0], entity.pos[1]),
                                (entity.pos[1]) * TILE_SIZE
                            ]}
                            onClick={e => {
                                e.stopPropagation();
                                handleEntityClick(entity);
                            }}
                        />
                    ))}
                    {Object.entries(allPlayers).map(([id, state]) => {
                        const currentAction = FakeServer.getCurrentAction(id);
                        let targetPosition: [number, number, number] | undefined = undefined;
                        if (
                            currentAction === "attack" &&
                            state.currentGoal &&
                            state.currentGoal.type === "attack" &&
                            "targetId" in state.currentGoal
                        ) {
                            const targetId = (state.currentGoal as { type: "attack"; targetId: string }).targetId;
                            const target = allPlayers[targetId];
                            if (target) {
                                targetPosition = [
                                    (target.pos[0]) * TILE_SIZE,
                                    getY(target.pos[0], target.pos[1]) + 0.3,
                                    (target.pos[1]) * TILE_SIZE
                                ];
                            }
                        } else if (
                            currentAction === "extract" &&
                            state.currentGoal &&
                            state.currentGoal.type === "extractResource"
                        ) {
                            const entityId = (state.currentGoal as { type: "extractResource"; entityId: string }).entityId;
                            const entity = entities.find(e => e.id === entityId);
                            if (entity) {
                                targetPosition = [
                                    (entity.pos[0]) * TILE_SIZE,
                                    getY(entity.pos[0], entity.pos[1]),
                                    (entity.pos[1]) * TILE_SIZE
                                ];
                            }
                        }
                        return (
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
                                    currentAction={currentAction}
                                    targetPosition={targetPosition}
                                />
                            </group>
                        );
                    })}
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
