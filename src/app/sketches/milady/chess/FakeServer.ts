// Centralized fake server for game state

// Action types
type PlayerAction = 
    | { type: "walkTo", pos: [number, number] }
    | { type: "attack", targetId: string }
    | { type: "pickUp", itemId: string }
    | { type: "pickupDrop", dropId: string };

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

const SERVER_TICK = 600; // milliseconds
const GRID_SIZE = 20; // Size of each grid cell in the tilemap

const tilemap = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(1));
const players: Record<string, PlayerState> = {};

// New: Player inventories (not broadcast to all)
const playerInventories: Record<string, Record<string, number>> = {};


function getStep(from: [number, number], to: [number, number]) {
    const [fx, fz] = from;
    const [tx, tz] = to;
    const dx = tx - fx;
    const dz = tz - fz;
    // Allow diagonal movement: step both axes if both are nonzero
    if (dx !== 0 && dz !== 0) return [fx + Math.sign(dx), fz + Math.sign(dz)] as [number, number];
    if (dx !== 0) return [fx + Math.sign(dx), fz] as [number, number];
    if (dz !== 0) return [fx, fz + Math.sign(dz)] as [number, number];
    return [fx, fz] as [number, number];
}

function areAdjacent(a: [number, number], b: [number, number]) {
    const dx = Math.abs(a[0] - b[0]);
    const dy = Math.abs(a[1] - b[1]);
    return dx <= 1 && dy <= 1 && (dx + dy > 0);
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
            player.actionCooldown = 0; // walking can be instant or set to 1 for delay
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
            if (player.pos[0] === target.pos[0] && player.pos[1] === target.pos[1]) {
                const directions = [
                    [1, 0], [-1, 0], [0, 1], [0, -1],
                    [1, 1], [1, -1], [-1, 1], [-1, -1]
                ];
                for (const [dx, dy] of directions) {
                    const newPos: [number, number] = [target.pos[0] + dx, target.pos[1] + dy];
                    if (
                        newPos[0] >= 0 && newPos[0] < tilemap.length &&
                        newPos[1] >= 0 && newPos[1] < tilemap[0].length &&
                        (newPos[0] !== target.pos[0] || newPos[1] !== target.pos[1])
                    ) {
                        player.pos = newPos;
                        break;
                    }
                }
                player.actionCooldown = 0;
            } else if (!areAdjacent(player.pos, target.pos)) {
                player.pos = getStep(player.pos, target.pos);
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
        }
    }
    // Tick drops
    for (let i = drops.length - 1; i >= 0; i--) {
        drops[i].expiryTicks -= 1;
        if (drops[i].expiryTicks <= 0) {
            drops.splice(i, 1);
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
    }
};

// Populate server with 2 random players on start
if (Object.keys(players).length === 0) {
    for (let i = 0; i < 2; i++) {
        const id = Math.random().toString(36).slice(2) + Date.now() + i;
        getPlayer(id);
    }
}

export default FakeServer;
