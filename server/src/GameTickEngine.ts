import { MyRoomState } from "./rooms/schema/MyRoomState";

class GameTickEngine {
    entityState: Map<string, { currentAction: string | undefined; cooldownTicks: number }> = new Map();
    tickInterval = 600;
    lastTickTimestamp: number = Date.now();
    tickTimer: ReturnType<typeof setInterval> | null = null;
    onTick: (() => void) | null = null;
    state: MyRoomState;

    constructor(state: MyRoomState, onTick?: () => void) {
        this.state = state;
        this.onTick = onTick || null;
        this.startTicking();
    }
    
    setPlayerAction(clientId: string, action: string | undefined) {
        this.entityState.set(clientId, { currentAction: action, cooldownTicks: 0 });
    }

    stepNavigation(clientId: string, dest: { x: number, z: number }) {
        const player = this.state.players.get(clientId);
        if (!player) return false;
        const px = Math.round(player.position.x);
        const pz = Math.round(player.position.z);
        if (px === dest.x && pz === dest.z) return true;
        // Move one tile in x and/or z toward dest (allow diagonal)
        if (px !== dest.x) {
            player.position.x += dest.x > px ? 1 : -1;
        }
        if (pz !== dest.z) {
            player.position.z += dest.z > pz ? 1 : -1;
        }
        console.log(`Client ${clientId} moved to (${Math.round(player.position.x)}, ${Math.round(player.position.z)})`);
        return (Math.round(player.position.x) === dest.x && Math.round(player.position.z) === dest.z);
    }

    isAdjacent(posA: { x: number, z: number }, posB: { x: number, z: number }): boolean {
        const ax = Math.round(posA.x);
        const az = Math.round(posA.z);
        const bx = Math.round(posB.x);
        const bz = Math.round(posB.z);
        const dx = Math.abs(ax - bx);
        const dz = Math.abs(az - bz);
        return (dx <= 1 && dz <= 1) && (dx + dz > 0);
    }

    tick() {
        for (const [clientId, state] of this.entityState.entries()) {
            if (!state.currentAction) {
                // Check if this is an AI player and assign a random walkTo action
                const player = this.state.players.get(clientId);
                if (player && player.controller === "ai") {
                    // Pick a random destination within 5 tiles radius
                    const px = Math.round(player.position.x);
                    const pz = Math.round(player.position.z);
                    const radius = 5;
                    // Random offset in [-radius, radius]
                    const dx = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
                    const dz = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
                    // Avoid 0,0 (no movement)
                    if (dx !== 0 || dz !== 0) {
                        const destX = px + dx;
                        const destZ = pz + dz;
                        state.currentAction = `walkTo ${destX},${destZ}`;
                    }
                }
                continue;
            }
            if (state.cooldownTicks > 0) {
                state.cooldownTicks--;
                continue;
            }

            const [cmd, ...args] = state.currentAction.split(" ");
            // process player action for each tick here
            if (cmd === "walkTo") {
                // walkTo x,z
                const parts = args.join().split(",");
                const dest = { x: Math.round(parseFloat(parts[0])), z: Math.round(parseFloat(parts[1])) };
                const reached = this.stepNavigation(clientId, dest);
                if (reached) {
                    // If AI, set cooldown and clear action
                    const player = this.state.players.get(clientId);
                    if (player && player.controller === "ai") {
                        state.cooldownTicks = 5;
                        state.currentAction = undefined;
                    }
                }
            } else if (cmd === "attack") {
                // attack <playerid>
                const targetId = args[0];
                const player = this.state.players.get(clientId);
                const target = this.state.players.get(targetId);
                if (!player || !target) {
                    state.currentAction = undefined;
                    return;
                }
                // Use isAdjacent function
                if (this.isAdjacent(player.position, target.position)) {
                    // Attack!
                    state.cooldownTicks = 1;
                    const dmg = Math.floor(Math.random() * 3); // 0, 1, or 2
                    target.status.health = Math.max(0, target.status.health - dmg);
                    console.log(`Client ${clientId} attacked ${targetId} for ${dmg} damage (health now ${target.status.health})`);
                    // If opponent has no action, set to attack back
                    const targetState = this.entityState.get(targetId);
                    if (targetState && !targetState.currentAction) {
                        targetState.currentAction = `attack ${clientId}`;
                    }
                    // Optionally clear action if target is dead
                    if (target.status.health <= 0) {
                        console.log(`Client ${targetId} has been defeated!`);
                        state.currentAction = undefined;
                    }
                } else {
                    // Not adjacent, walk to target
                    const tx = Math.round(target.position.x);
                    const tz = Math.round(target.position.z);
                    state.currentAction = `walkTo ${tx},${tz}`;
                }
            } else {
                // ...other actions...
                console.log(`Client ${clientId} action: ${state.currentAction}`);
                state.currentAction = undefined;
            }
        }
        if (this.onTick) {
            this.onTick();
        }
        this.lastTickTimestamp = Date.now();
    }
    
    startTicking() {
        if (this.tickTimer) return;
        this.tickTimer = setInterval(() => {
            const now = Date.now();
            let ticksToRun = Math.floor((now - this.lastTickTimestamp) / this.tickInterval);
            while (ticksToRun > 0) {
                this.tick();
                ticksToRun--;
            }
        }, this.tickInterval);
    }
    
    stopTicking() {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
    }
}

export default GameTickEngine;