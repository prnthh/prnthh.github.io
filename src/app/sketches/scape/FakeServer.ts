import { MapEntity, MapEntityType } from "./MapEntity";

// Centralized fake server for game state

// Action types
type PlayerAction = 
    | { type: "walkTo", pos: [number, number] }
    | { type: "attack", targetId: string }
    | { type: "pickUp", itemId: string }
    | { type: "pickupDrop", dropId: string }
    | { type: "extractResource", entityId: string };

interface PlayerState {
    pos: [number, number];
    currentAction?: PlayerAction;
    health: number;
    actionCooldown?: number; // ticks left before next action
}

// Drop type and drops list
interface Drop {
    id: string;
    itemKey: string;
    quantity: number;
    pos: [number, number];
    expiryTicks: number;
}
let drops: Drop[] = [];

// Map entities (trees, ores)
const mapEntities: MapEntity[] = [];

// Configs for resource extraction
const RESOURCE_EXTRACTION_AMOUNT = 1;
const RESOURCE_EXTRACTION_COOLDOWN = 3; // ticks between extractions
const RESOURCE_REPLENISH_TICKS = 20; // ticks to replenish after depletion

const SERVER_TICK = 600; // milliseconds
const GRID_SIZE = 16; // Size of each grid cell in the tilemap

const tilemap = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(1));
const players: Record<string, PlayerState> = {};

// New: Player inventories (not broadcast to all)
const playerInventories: Record<string, Record<string, number>> = {};

// Returns true if a tile is occupied by a map entity (always blocks map entity tiles)
function isTileBlocked(x: number, y: number) {
    return mapEntities.some(e => e.pos[0] === x && e.pos[1] === y);
}

// Returns the nearest walkable adjacent tile to (x, y) from fromPos
// Never allows stepping onto a map entity tile
function getNearestAdjacentTile(fromPos: [number, number], x: number, y: number) {
    const directions = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    let minDist = Infinity;
    let best: [number, number] | null = null;
    for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy;
        if (
            nx >= 0 && nx < GRID_SIZE &&
            ny >= 0 && ny < GRID_SIZE &&
            !isTileBlocked(nx, ny)
        ) {
            const dist = Math.abs(fromPos[0] - nx) + Math.abs(fromPos[1] - ny);
            if (dist < minDist) {
                minDist = dist;
                best = [nx, ny];
            }
        }
    }
    return best;
}

// Basic BFS pathfinding with max depth
function bfsPathfind(start: [number, number], goal: [number, number], maxDepth = 32): [number, number][] | null {
    if (start[0] === goal[0] && start[1] === goal[1]) return [start];
    // Never allow path to end on a map entity tile
    if (isTileBlocked(goal[0], goal[1])) return null;
    const queue: { pos: [number, number]; path: [number, number][]; depth: number }[] = [
        { pos: start, path: [start], depth: 0 }
    ];
    const visited = new Set<string>();
    visited.add(start[0] + "," + start[1]);
    const directions = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    while (queue.length > 0) {
        const { pos, path, depth } = queue.shift()!;
        if (depth >= maxDepth) continue;
        for (const [dx, dy] of directions) {
            const nx = pos[0] + dx, ny = pos[1] + dy;
            if (
                nx === goal[0] && ny === goal[1]
            ) {
                // Don't allow stepping onto a map entity tile
                if (!isTileBlocked(nx, ny)) {
                    return [...path, [nx, ny]];
                } else {
                    continue;
                }
            }
            if (
                nx >= 0 && nx < GRID_SIZE &&
                ny >= 0 && ny < GRID_SIZE &&
                !isTileBlocked(nx, ny)
            ) {
                const key = nx + "," + ny;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ pos: [nx, ny], path: [...path, [nx, ny]], depth: depth + 1 });
                }
            }
        }
    }
    return null;
}

// Updated getStep to use BFS pathfinding
function getStep(from: [number, number], to: [number, number]) {
    if (from[0] === to[0] && from[1] === to[1]) return from;
    const path = bfsPathfind(from, to, 32);
    if (path && path.length > 1) {
        return path[1]; // next step
    }
    return from;
}

function areAdjacent(a: [number, number], b: [number, number]) {
    const dx = Math.abs(a[0] - b[0]);
    const dy = Math.abs(a[1] - b[1]);
    return dx <= 1 && dy <= 1 && (dx + dy > 0);
}

// Helper to find entity by id
function getEntity(entityId: string): MapEntity | undefined {
    return mapEntities.find(e => e.id === entityId);
}

// --- Single global tick function ---
function globalTick() {
    // Tick all players
    for (const playerId in players) {
        const player = players[playerId];
        if (player.actionCooldown && player.actionCooldown > 0) {
            player.actionCooldown -= 1;
            continue;
        }
        if (!player.currentAction) continue;
        const action = player.currentAction;
        if (action.type === "walkTo") {
            player.pos = getStep(player.pos, action.pos);
            player.actionCooldown = 0;
            if (player.pos[0] === action.pos[0] && player.pos[1] === action.pos[1]) {
                player.currentAction = undefined;
            }
        } else if (action.type === "attack") {
            const target = players[action.targetId];
            if (!target || target.health <= 0) {
                player.currentAction = undefined;
                if (target && target.health <= 0) {
                    if (target.currentAction && target.currentAction.type === "attack" && target.currentAction.targetId === playerId) {
                        target.currentAction = undefined;
                    }
                    drops.push({
                        id: 'drop_' + Math.random().toString(36).slice(2) + Date.now(),
                        itemKey: 'bone',
                        quantity: 1,
                        pos: [...target.pos],
                        expiryTicks: 100
                    });
                    target.health = 10;
                    target.pos = [0, 0];
                }
                continue;
            }
            // Move to nearest adjacent tile to target
            const adj = getNearestAdjacentTile(player.pos, target.pos[0], target.pos[1]);
            if (!adj) {
                player.currentAction = undefined;
                player.actionCooldown = 0;
                continue;
            }
            if (player.pos[0] !== adj[0] || player.pos[1] !== adj[1]) {
                player.pos = getStep(player.pos, adj);
                player.actionCooldown = 0;
            } else {
                target.health = Math.max(0, target.health - 1);
                player.actionCooldown = 2;
                if (!target.currentAction) {
                    target.currentAction = { type: "attack", targetId: playerId };
                }
            }
        } else if (action.type === "pickUp") {
            player.currentAction = undefined;
            player.actionCooldown = 0;
        } else if (action.type === "pickupDrop") {
            const drop = drops.find(d => d.id === action.dropId);
            if (!drop) {
                player.currentAction = undefined;
                player.actionCooldown = 0;
                continue;
            }
            if (player.pos[0] !== drop.pos[0] || player.pos[1] !== drop.pos[1]) {
                player.pos = getStep(player.pos, drop.pos);
                player.actionCooldown = 0;
            } else {
                FakeServer.addToInventory(playerId, drop.itemKey, drop.quantity);
                drops = drops.filter(d => d.id !== drop.id);
                player.currentAction = undefined;
                player.actionCooldown = 0;
            }
        } else if (action.type === "extractResource") {
            const entity = getEntity(action.entityId);
            if (!entity) {
                player.currentAction = undefined;
                player.actionCooldown = 0;
                continue;
            }
            // Move to nearest adjacent tile to entity
            const adj = getNearestAdjacentTile(player.pos, entity.pos[0], entity.pos[1]);
            if (!adj) {
                player.currentAction = undefined;
                player.actionCooldown = 0;
                continue;
            }
            if (player.pos[0] !== adj[0] || player.pos[1] !== adj[1]) {
                player.pos = getStep(player.pos, adj);
                player.actionCooldown = 0;
            } else if (entity.depleted || entity.resourceAmount <= 0) {
                player.currentAction = undefined;
                player.actionCooldown = 0;
            } else {
                // Extract resource
                entity.resourceAmount -= RESOURCE_EXTRACTION_AMOUNT;
                if (entity.resourceAmount <= 0) {
                    entity.resourceAmount = 0;
                    entity.depleted = true;
                    entity.replenishTicksLeft = RESOURCE_REPLENISH_TICKS;
                }
                // Add to inventory (itemKey based on entity type)
                let itemKey = "unknown";
                if (entity.type.kind === "tree") itemKey = entity.type.treeType + "_log";
                if (entity.type.kind === "ore") itemKey = entity.type.oreType + "_ore";
                FakeServer.addToInventory(playerId, itemKey, 1);
                player.actionCooldown = RESOURCE_EXTRACTION_COOLDOWN;
                // If depleted, clear action
                if (entity.depleted) player.currentAction = undefined;
            }
        }
    }
    // Tick drops
    for (let i = drops.length - 1; i >= 0; i--) {
        drops[i].expiryTicks -= 1;
        if (drops[i].expiryTicks <= 0) {
            drops.splice(i, 1);
        }
    }
    // Tick map entities for replenishment
    for (const entity of mapEntities) {
        if (entity.depleted) {
            entity.replenishTicksLeft -= 1;
            if (entity.replenishTicksLeft <= 0) {
                entity.resourceAmount = entity.maxResource;
                entity.depleted = false;
                entity.replenishTicksLeft = 0;
            }
        }
    }
}

setInterval(globalTick, SERVER_TICK);

function getPlayer(playerId: string): PlayerState {
    // NOTE: This lazy creation is for the fake server only. Do NOT do this on a real server!
    if (!players[playerId]) {
        players[playerId] = {
            pos: [Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE)],
            health: 10
        };
    }
    // New: lazy create inventory
    if (!playerInventories[playerId]) {
        playerInventories[playerId] = {};
    }
    return players[playerId];
}

const FakeServer = {
    getTilemap() {
        return tilemap;
    },
    getPlayerPos(playerId: string) {
        return getPlayer(playerId).pos;
    },
    setAction(playerId: string, action: PlayerAction) {
        getPlayer(playerId).currentAction = action;
    },
    getCurrentAction(playerId: string) {
        return getPlayer(playerId)?.currentAction;
    },
    getAllPlayers() {
        return players;
    },
    getHealth(playerId: string) {
        return getPlayer(playerId)?.health;
    },
    // New: get a player's own inventory
    getInventory(playerId: string) {
        getPlayer(playerId); // ensure player/inventory exists
        return playerInventories[playerId];
    },
    // New: add items to a player's inventory
    addToInventory(playerId: string, itemKey: string, quantity: number) {
        getPlayer(playerId); // ensure player/inventory exists
        if (!playerInventories[playerId][itemKey]) {
            playerInventories[playerId][itemKey] = 0;
        }
        playerInventories[playerId][itemKey] += quantity;
        if (playerInventories[playerId][itemKey] <= 0) {
            delete playerInventories[playerId][itemKey];
        }
    },
    // New: get all drops
    getDrops() {
        return drops;
    },
    // New: get all entities
    getEntities() {
        return mapEntities;
    }
};

// Populate server with 2 random players on start
if (Object.keys(players).length === 0) {
    for (let i = 0; i < 2; i++) {
        const id = Math.random().toString(36).slice(2) + Date.now() + i;
        getPlayer(id);
    }
}
// Populate mapEntities with some trees and ores if empty
if (mapEntities.length === 0) {
    // Add a few trees and ores at fixed positions for demo
    mapEntities.push(
        {
            id: "tree1",
            type: { kind: "tree", treeType: "star" },
            pos: [2, 2],
            resourceAmount: 5,
            maxResource: 5,
            depleted: false,
            replenishTicksLeft: 0
        },
        {
            id: "ore1",
            type: { kind: "ore", oreType: "copper" },
            pos: [0, 0],
            resourceAmount: 3,
            maxResource: 3,
            depleted: false,
            replenishTicksLeft: 0
        },
        {
            id: "tree2",
            type: { kind: "tree", treeType: "heart" },
            pos: [8, 3],
            resourceAmount: 4,
            maxResource: 4,
            depleted: false,
            replenishTicksLeft: 0
        }
    );
}

export default FakeServer;
