import { Topic } from './topic';
import type { AnyEntity } from './world';
export declare class EntityCollection<Entity> {
    entities: Entity[];
    version: number;
    onEntityAdded: Topic<[entity: Entity]>;
    onEntityRemoved: Topic<[entity: Entity]>;
    /** @ignore */
    _entityPositions: Map<Entity, number>;
    get first(): Entity | undefined;
    get size(): number;
    [Symbol.iterator](): {
        next: () => {
            value: Entity;
            done: boolean;
        };
    };
    has(entity: Entity): boolean;
}
export declare const addToCollection: <E extends AnyEntity>(collection: EntityCollection<E>, entity: E) => void;
export declare const removeFromCollection: <E extends AnyEntity>(collection: EntityCollection<E>, entity: E) => void;
