export interface BasePlayerState {
    pos: [number, number];
    health: number;
    currentGoal?: any;
    actionCooldown?: number;
    currentAction?: string;
}

export interface BaseDrop {
    id: string;
    itemKey: string;
    quantity: number;
    pos: [number, number];
    expiryTicks: number;
}

export interface BaseEntity {
    id: string;
    pos: [number, number];
}

export abstract class BaseServer<
    PlayerState extends BasePlayerState,
    DropType extends BaseDrop,
    EntityType extends BaseEntity
> {
    protected players: Record<string, PlayerState> = {};
    protected drops: DropType[] = [];
    protected entities: EntityType[] = [];
    protected playerInventories: Record<string, Record<string, number>> = {};

    abstract tick(): void;

    getPlayer(playerId: string): PlayerState {
        if (!this.players[playerId]) {
            this.players[playerId] = this.createPlayer(playerId);
        }
        if (!this.playerInventories[playerId]) {
            this.playerInventories[playerId] = {};
        }
        return this.players[playerId];
    }

    protected abstract createPlayer(playerId: string): PlayerState;

    getAllPlayers() {
        return this.players;
    }

    getInventory(playerId: string) {
        this.getPlayer(playerId);
        return this.playerInventories[playerId];
    }

    addToInventory(playerId: string, itemKey: string, quantity: number) {
        this.getPlayer(playerId);
        if (!this.playerInventories[playerId][itemKey]) {
            this.playerInventories[playerId][itemKey] = 0;
        }
        this.playerInventories[playerId][itemKey] += quantity;
        if (this.playerInventories[playerId][itemKey] <= 0) {
            delete this.playerInventories[playerId][itemKey];
        }
    }

    getDrops() {
        return this.drops;
    }

    getEntities() {
        return this.entities;
    }
}
