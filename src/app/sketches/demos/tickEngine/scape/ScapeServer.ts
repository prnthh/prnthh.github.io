import { BaseServer, BasePlayerState, BaseDrop, BaseEntity } from "../BaseServer";
import { MapEntity, MapEntityType } from "./map/MapEntity";

// Action log types for ScapeServer
export type ScapeAction =
| { type: "addPlayer"; player: ScapePlayerState & { id: string } }
| { type: "updatePlayer"; player: ScapePlayerState & { id: string } }
| { type: "removePlayer"; playerId: string }
| { type: "addDrop"; drop: ScapeDrop }
| { type: "removeDrop"; dropId: string }
| { type: "updateDrop"; drop: ScapeDrop }
| { type: "addEntity"; entity: ScapeEntity }
| { type: "updateEntity"; entity: ScapeEntity }
| { type: "removeEntity"; entityId: string };

// Centralized fake server for game state

// Action types
type PlayerGoal = 
| { type: "walkTo", pos: [number, number] }
| { type: "attack", targetId: string }
| { type: "pickUp", itemId: string }
| { type: "pickupDrop", dropId: string }
| { type: "extractResource", entityId: string };

interface ScapePlayerState extends BasePlayerState {
    currentGoal?: PlayerGoal;
    behavior?: string;
}
interface ScapeDrop extends BaseDrop {}
interface ScapeEntity extends MapEntity {}

// Configs for resource extraction
const RESOURCE_EXTRACTION_AMOUNT = 1;
const RESOURCE_REPLENISH_TICKS = 20; // ticks to replenish after depletion

const SERVER_TICK = 600; // milliseconds
const GRID_SIZE = 16; // Size of each grid cell in the tilemap

const tilemap = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(1));

// --- Utility Functions ---
function isTileBlocked(x: number, y: number, entities: MapEntity[]) {
    return entities.some(e => e.pos[0] === x && e.pos[1] === y);
}
function getNearestAdjacentTile(fromPos: [number, number], x: number, y: number, entities: MapEntity[]) {
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
            !isTileBlocked(nx, ny, entities)
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
function bfsPathfind(start: [number, number], goal: [number, number], entities: MapEntity[], maxDepth = 32): [number, number][] | null {
    if (start[0] === goal[0] && start[1] === goal[1]) return [start];
    // Never allow path to end on a map entity tile
    if (isTileBlocked(goal[0], goal[1], entities)) return null;
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
                if (!isTileBlocked(nx, ny, entities)) {
                    return [...path, [nx, ny]];
                } else {
                    continue;
                }
            }
            if (
                nx >= 0 && nx < GRID_SIZE &&
                ny >= 0 && ny < GRID_SIZE &&
                !isTileBlocked(nx, ny, entities)
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
function getStep(from: [number, number], to: [number, number], entities: MapEntity[]) {
    if (from[0] === to[0] && from[1] === to[1]) return from;
    const path = bfsPathfind(from, to, entities, 32);
    if (path && path.length > 1) {
        return path[1]; // next step
    }
    return from;
}
function getEntity(entityId: string, entities: MapEntity[]): MapEntity | undefined {
    return entities.find(e => e.id === entityId);
}

// --- ScapeServer Class ---
class ScapeServer extends BaseServer<ScapePlayerState, ScapeDrop, ScapeEntity> {
    private actionLog: ScapeAction[] = [];
    
    protected createPlayer(playerId: string): ScapePlayerState {
        const player: ScapePlayerState = {
            pos: [Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE)] as [number, number],
            health: 10
        };
        // Log addPlayer action
        this.actionLog.push({ type: "addPlayer", player: { ...player, id: playerId } });
        return player;
    }
    
    // --- Goal Handlers ---
    // Assign a random wander goal within a 5-tile radius
    private assignWanderGoal(player: ScapePlayerState, playerId: string) {
        const radius = 5;
        const [x, y] = player.pos;
        let attempts = 10;
        while (attempts-- > 0) {
            const dx = Math.floor(Math.random() * (2 * radius + 1)) - radius;
            const dy = Math.floor(Math.random() * (2 * radius + 1)) - radius;
            const tx = x + dx;
            const ty = y + dy;
            if (
                (dx !== 0 || dy !== 0) &&
                tx >= 0 && tx < GRID_SIZE &&
                ty >= 0 && ty < GRID_SIZE &&
                !isTileBlocked(tx, ty, this.entities)
            ) {
                player.currentGoal = { type: "walkTo", pos: [tx, ty] };
                player.actionCooldown = 10;
                this.logPlayerUpdate(player, playerId);
                break;
            }
        }
    }
    
    private handleWalkTo(player: ScapePlayerState, goal: any, playerId: string) {
        const prevPos = [...player.pos];
        player.pos = getStep(player.pos, goal.pos, this.entities);
        if (player.pos[0] === goal.pos[0] && player.pos[1] === goal.pos[1]) {
            player.currentGoal = undefined;
            player.actionCooldown = 0;
        }
        if (player.pos[0] !== prevPos[0] || player.pos[1] !== prevPos[1] || player.currentGoal === undefined) {
            this.logPlayerUpdate(player, playerId);
        }
    }
    private handleAttack(player: ScapePlayerState, goal: any, playerId: string) {
        const target = this.players[goal.targetId];
        if (!target || target.health <= 0) {
            player.currentGoal = undefined;
            if (target && target.health <= 0) {
                if (target.currentGoal && target.currentGoal.type === "attack" && target.currentGoal.targetId === playerId) {
                    target.currentGoal = undefined;
                }
                this.drops.push({
                    id: 'drop_' + Math.random().toString(36).slice(2) + Date.now(),
                    itemKey: 'bone',
                    quantity: 1,
                    pos: [...target.pos],
                    expiryTicks: 100
                });
                this.actionLog.push({ type: "addDrop", drop: this.drops[this.drops.length - 1] });
                target.health = 10;
                target.pos = [0, 0];
                this.logPlayerUpdate(target, goal.targetId);
            }
            this.logPlayerUpdate(player, playerId);
        } else {
            const adj = getNearestAdjacentTile(player.pos, target.pos[0], target.pos[1], this.entities);
            if (!adj) {
                player.currentGoal = undefined;
                player.actionCooldown = 0;
                this.logPlayerUpdate(player, playerId);
            } else if (player.pos[0] !== adj[0] || player.pos[1] !== adj[1]) {
                player.pos = getStep(player.pos, adj, this.entities);
                player.actionCooldown = 0;
                this.logPlayerUpdate(player, playerId);
            } else {
                target.health = Math.max(0, target.health - 1);
                target.actionCooldown = 1;
                player.actionCooldown = 2;
                player.currentAction = "attack";
                this.logPlayerUpdate(target, goal.targetId);
                if (!target.currentGoal || target.currentGoal.type !== "attack") {
                    target.currentGoal = { type: "attack", targetId: playerId };
                }
                this.logPlayerUpdate(player, playerId);
            }
        }
    }
    private handlePickupDrop(player: ScapePlayerState, goal: any, playerId: string) {
        const drop = this.drops.find(d => d.id === goal.dropId);
        if (!drop) {
            player.currentGoal = undefined;
            player.actionCooldown = 0;
            this.logPlayerUpdate(player, playerId);
        } else if (player.pos[0] !== drop.pos[0] || player.pos[1] !== drop.pos[1]) {
            player.pos = getStep(player.pos, drop.pos, this.entities);
            player.actionCooldown = 0;
            this.logPlayerUpdate(player, playerId);
        } else {
            this.addToInventory(playerId, drop.itemKey, drop.quantity);
            this.actionLog.push({ type: "removeDrop", dropId: drop.id });
            this.drops = this.drops.filter(d => d.id !== drop.id);
            player.currentGoal = undefined;
            player.actionCooldown = 0;
            this.logPlayerUpdate(player, playerId);
        }
    }
    private handleExtractResource(player: ScapePlayerState, goal: any, playerId: string) {
        const entity = getEntity(goal.entityId, this.entities);
        if (!entity) {
            player.currentGoal = undefined;
            player.actionCooldown = 0;
            this.logPlayerUpdate(player, playerId);
        } else {
            const adj = getNearestAdjacentTile(player.pos, entity.pos[0], entity.pos[1], this.entities);
            if (!adj) {
                player.currentGoal = undefined;
                player.actionCooldown = 0;
                this.logPlayerUpdate(player, playerId);
            } else if (player.pos[0] !== adj[0] || player.pos[1] !== adj[1]) {
                player.pos = getStep(player.pos, adj, this.entities);
                player.actionCooldown = 0;
                this.logPlayerUpdate(player, playerId);
            } else if (entity.depleted || entity.resourceAmount <= 0) {
                player.currentGoal = undefined;
                player.actionCooldown = 0;
                this.logPlayerUpdate(player, playerId);
            } else {
                entity.resourceAmount -= RESOURCE_EXTRACTION_AMOUNT;
                if (entity.resourceAmount <= 0) {
                    entity.resourceAmount = 0;
                    entity.depleted = true;
                    entity.replenishTicksLeft = RESOURCE_REPLENISH_TICKS;
                }
                let itemKey = "unknown";
                if (entity.type.kind === "tree") itemKey = entity.type.treeType + "_log";
                if (entity.type.kind === "ore") itemKey = entity.type.oreType + "_ore";
                this.addToInventory(playerId, itemKey, 1);
                player.actionCooldown = entity.extractionCooldown;
                player.currentAction = "extract";
                this.actionLog.push({ type: "updateEntity", entity: { ...entity } });
                if (entity.depleted) player.currentGoal = undefined;
                this.logPlayerUpdate(player, playerId);
            }
        }
    }
    private logPlayerUpdate(player: ScapePlayerState, playerId: string) {
        this.actionLog.push({ type: "updatePlayer", player: { ...player, id: playerId } });
    }
    
    tick() {
        this.actionLog = [];
        // Clear currentAction for all players at the start of the tick
        for (const pid in this.players) {
            const player = this.players[pid];
            if (player.currentAction !== undefined) {
                player.currentAction = undefined;
                this.logPlayerUpdate(player, pid); // Notify client of cleared action
            } else {
                player.currentAction = undefined;
            }
        }

        // Tick all players
        for (const playerId in this.players) {
            const player = this.players[playerId];
            if (player.actionCooldown && player.actionCooldown > 0) {
                player.actionCooldown -= 1;
                continue;
            }

            if (player.behavior && !player.currentGoal) {
                if (player.behavior === "wander") {
                    this.assignWanderGoal(player, playerId);
                }
                // Add more behaviors here if needed
            }

            if (!player.currentGoal) continue;
            const goal = player.currentGoal;
            switch (goal.type) {
                case "walkTo":
                    this.handleWalkTo(player, goal, playerId);
                    break;
                case "attack":
                    this.handleAttack(player, goal, playerId);
                    break;
                case "pickupDrop":
                    this.handlePickupDrop(player, goal, playerId);
                    break;
                case "extractResource":
                    this.handleExtractResource(player, goal, playerId);
                    break;
                case "pickUp":
                    player.currentGoal = undefined;
                    player.actionCooldown = 0;
                    this.logPlayerUpdate(player, playerId);
                    break;
            }
        }
        // Tick drops
        for (let i = this.drops.length - 1; i >= 0; i--) {
            this.drops[i].expiryTicks -= 1;
            if (this.drops[i].expiryTicks <= 0) {
                this.actionLog.push({ type: "removeDrop", dropId: this.drops[i].id });
                this.drops.splice(i, 1);
            } else {
                this.actionLog.push({ type: "updateDrop", drop: this.drops[i] });
            }
        }
        // Tick map entities for replenishment
        for (const entity of this.entities) {
            if (entity.depleted) {
                entity.replenishTicksLeft -= 1;
                if (entity.replenishTicksLeft <= 0) {
                    entity.resourceAmount = entity.maxResource;
                    entity.depleted = false;
                    entity.replenishTicksLeft = 0;
                    this.actionLog.push({ type: "updateEntity", entity: { ...entity } });
                }
            }
        }
    }
    
    getTilemap() {
        return tilemap;
    }
    getPlayerPos(playerId: string) {
        return this.getPlayer(playerId).pos;
    }
    setGoal(playerId: string, goal: PlayerGoal) {
        this.getPlayer(playerId).currentGoal = goal;
    }
    getCurrentGoal(playerId: string) {
        return this.getPlayer(playerId)?.currentGoal;
    }
    getAllPlayers() {
        return this.players;
    }
    getHealth(playerId: string) {
        return this.getPlayer(playerId)?.health;
    }
    getInventory(playerId: string) {
        return super.getInventory(playerId);
    }
    addToInventory(playerId: string, itemKey: string, quantity: number) {
        super.addToInventory(playerId, itemKey, quantity);
    }
    getDrops() {
        return this.drops;
    }
    getEntities() {
        return this.entities;
    }
    getCurrentAction(playerId: string) {
        return this.players[playerId]?.currentAction;
    }
    
    // Return a snapshot of the current state as a list of actions
    getSnapshotActions(): ScapeAction[] {
        const actions: ScapeAction[] = [];
        for (const playerId in this.players) {
            actions.push({ type: "addPlayer", player: { ...this.players[playerId], id: playerId } });
        }
        for (const entity of this.entities) {
            actions.push({ type: "addEntity", entity: { ...entity } });
        }
        for (const drop of this.drops) {
            actions.push({ type: "addDrop", drop: { ...drop } });
        }
        return actions;
    }
    
    // Return and clear the actions from the last tick
    getAndClearActions(): ScapeAction[] {
        const actions = [...this.actionLog];
        this.actionLog = [];
        return actions;
    }
}

// Instantiate and export a singleton
const server = new ScapeServer();
setInterval(() => server.tick(), SERVER_TICK);

// Populate server with 2 random players on start
if (Object.keys(server.getAllPlayers()).length === 0) {
    for (let i = 0; i < 2; i++) {
        const id = Math.random().toString(36).slice(2) + Date.now() + i;
        const player = server.getPlayer(id);
        player.behavior = "wander"; // Set behavior to 'wander' for initial players
    }
}

// Populate mapEntities with some trees and ores if empty
if (server.getEntities().length === 0) {
    server.getEntities().push(
        {
            id: "tree1",
            type: { kind: "tree", treeType: "star" },
            pos: [2, 2],
            extractionCooldown: 6,
            resourceAmount: 5,
            maxResource: 5,
            depleted: false,
            replenishTicksLeft: 0
        },
        {
            id: "ore1",
            type: { kind: "ore", oreType: "copper" },
            pos: [3, 6],
            extractionCooldown: 6,
            resourceAmount: 3,
            maxResource: 3,
            depleted: false,
            replenishTicksLeft: 0
        },
        {
            id: "ore2",
            type: { kind: "ore", oreType: "copper" },
            pos: [3, 8],
            extractionCooldown: 6,
            resourceAmount: 3,
            maxResource: 3,
            depleted: false,
            replenishTicksLeft: 0
        },
        {
            id: "tree2",
            type: { kind: "tree", treeType: "heart" },
            pos: [8, 3],
            extractionCooldown: 3,
            resourceAmount: 4,
            maxResource: 4,
            depleted: false,
            replenishTicksLeft: 0
        }
    );
}

export default server;
