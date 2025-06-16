"use client";

import { useState, useEffect } from "react";
import FakeServer, { ScapeAction } from "./scape/ScapeServer";
import { MapEntity, MapEntityMesh, MapEntityInstancesProvider } from "./scape/map/MapEntity";
import { InventoryUI } from "./scape/ui/Inventory";
import MapGrid, { generateHeight } from "./scape/map/MapGrid";
import { WebGPUCanvas } from "../../../../shared/WebGPUCanvas";
import FogBG from "../../lighting/reflection/FogBG";
import { Html } from "@react-three/drei";
import Player from "./scape/Player";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";
import { Canvas } from "@react-three/fiber";

const TILE_SIZE = 0.66; // Size of each tile in the tilemap
const GRID_WIDTH = 16;
const GRID_DEPTH = 16;

function applyActions(
    actions: ScapeAction[],
    state: {
        players: Record<string, any>,
        drops: any[],
        entities: MapEntity[]
    }
) {
    for (const action of actions) {
        switch (action.type) {
            case "addPlayer":
                state.players[action.player.id] = { ...action.player };
                break;
            case "removePlayer":
                delete state.players[action.playerId];
                break;
            case "updatePlayer":
                state.players[action.player.id] = { ...action.player };
                break;
            case "addEntity":
                state.entities.push({ ...action.entity });
                break;
            case "removeEntity":
                state.entities = state.entities.filter(e => e.id !== action.entityId);
                break;
            case "updateEntity":
                state.entities = state.entities.map(e => e.id === action.entity.id ? { ...action.entity } : e);
                break;
            case "addDrop":
                state.drops.push({ ...action.drop });
                break;
            case "removeDrop":
                state.drops = state.drops.filter(d => d.id !== action.dropId);
                break;
            case "updateDrop":
                state.drops = state.drops.map(d => d.id === action.drop.id ? { ...action.drop } : d);
                break;
        }
    }
}

export default function Home() {
    const [playerId] = useState(() => Math.random().toString(36).slice(2) + Date.now());
    const [heightData] = useState(() => generateHeight(GRID_WIDTH, GRID_DEPTH));

    const [actionLog, setActionLog] = useState<ScapeAction[]>([]);

    // Action-based state
    const [players, setPlayers] = useState<Record<string, any>>({});
    const [drops, setDrops] = useState<any[]>([]);
    const [entities, setEntities] = useState<MapEntity[]>([]);
    const [navPointer, setNavPointer] = useState<[number, number, number] | null>(null);
    const [navPointerKey, setNavPointerKey] = useState(0);

    // On mount, get snapshot
    useEffect(() => {
        const snapshot = FakeServer.getSnapshotActions();
        const state = { players: {}, drops: [], entities: [] };
        applyActions(snapshot, state);
        setPlayers({ ...state.players });
        setDrops([...state.drops]);
        setEntities([...state.entities]);
    }, []);

    // On tick, apply actions
    useEffect(() => {
        const interval = setInterval(() => {
            const actions = FakeServer.getAndClearActions();
            if (actions.length === 0) return;
            setPlayers(prev => {
                const state = { players: { ...prev }, drops: [...drops], entities: [...entities] };
                applyActions(actions, state);
                setDrops([...state.drops]);
                setEntities([...state.entities]);
                return { ...state.players };
            });
            // setActionLog(prev => [...prev, ...actions]); // Only called if actions.length > 0
            setActionLog(prev => [...prev, ...actions.map(a => JSON.parse(JSON.stringify(a)))]); // Only called if actions.length > 0

        }, 200);
        return () => clearInterval(interval);
    }, [drops, entities]);

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

    const playerPos = players[playerId]?.pos || [0, 0];

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows>
                    <MapGrid
                        width={GRID_WIDTH}
                        depth={GRID_DEPTH}
                        tileSize={TILE_SIZE}
                        heightData={heightData}
                        onTileClick={({ i, j, x, y, z }) => {
                            FakeServer.setGoal(playerId, { type: "walkTo", pos: [i, j] });
                            setNavPointer([x, getY(i, j), z]);
                            setNavPointerKey(k => k + 1); // Increment key to replay GIF
                        }}
                    />
                    {/* NavPointer debug cube */}
                    {navPointer && (
                        <Html position={navPointer} className="pointer-events-none">
                            <div className="w-4 h-4 -translate-x-1/2 -translate-y-1/2">
                                <img
                                    key={navPointerKey}
                                    src={`/ui/click.gif?key=${navPointerKey}`}
                                    alt="Nav Pointer"
                                    className="w-full z-40"
                                />
                            </div>
                        </Html>
                    )}
                    {/* Render map entities (trees, ores) */}
                    <MapEntityInstancesProvider>
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
                    </MapEntityInstancesProvider>
                    {Object.entries(players).map(([id, state]) => {
                        const currentAction = state.currentAction;
                        let targetPosition: [number, number, number] | undefined = undefined;
                        if (
                            currentAction === "attack" &&
                            state.currentGoal &&
                            state.currentGoal.type === "attack" &&
                            "targetId" in state.currentGoal
                        ) {
                            const targetId = (state.currentGoal as { type: "attack"; targetId: string }).targetId;
                            const target = players[targetId];
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
                                    debug
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
                    <ShadowLight />
                    <FogBG />
                </Canvas>
            </div>
            <InventoryUI playerId={playerId} actionLog={actionLog} />
        </div>
    );
}
