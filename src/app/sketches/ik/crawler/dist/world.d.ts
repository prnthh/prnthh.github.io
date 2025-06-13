import { EntityCollection } from './entity-collection';
import { Query, QueryFn } from './query';
export type AnyEntity = Record<string, any>;
export declare class World<E extends AnyEntity = any> extends EntityCollection<E> {
    queries: Query<any>[];
    /**
     * Creates a new entity
     * @param entity
     * @returns the created entity
     *
     * @example
     * ```ts
     * const entity = {
     *   position: { x: 0, y: 0 },
     *   velocity: { x: 0, y: 0 },
     * }
     *
     * world.create(entity)
     * ```
     *
     * @example
     * ```ts
     * const entity = world.create({
     *   position: { x: 0, y: 0 },
     *   velocity: { x: 0, y: 0 },
     * })
     * ```
     */
    create<Entity extends E>(entity: Entity): E & Entity;
    /**
     * Destroys an entity
     * @param entity
     *
     * @example
     * ```ts
     * const entity = world.create({ foo: 'bar' })
     * world.destroy(entity)
     * ```
     */
    destroy(entity: E): void;
    /**
     * Adds a component to an entity
     * @param entity
     * @param component
     * @param value
     * @returns the world, for chaining
     *
     * @example
     * ```ts
     * const entity = {}
     * world.create(entity)
     * world.add(entity, 'foo', 'bar')
     * ```
     */
    add<C extends keyof E>(entity: E, component: C, value: E[C]): void;
    /**
     * Removes a component from an entity
     * @param entity
     * @param component
     * @returns the world, for chaining
     *
     * @example
     * ```ts
     * const entity = {}
     * world.create(entity)
     * world.add(entity, 'foo', 'bar')
     * world.remove(entity, 'foo')
     * ```
     */
    remove(entity: E, component: keyof E): void;
    /**
     * Applies an update to an entity, checking for added and removed components and updating queries.
     * The update is applied in bulk, so queries are only updated once.
     * @param entity the entity to update
     * @param updateFn the update function
     *
     * @example
     * ```ts
     * const entity = world.create({ health: 10, poisioned: true })
     *
     * // add and remove components in a single bulk update, using regular object syntax
     * world.update(entity, (e) => {
     *   // add a component
     *   e.position = { x: 0, y: 0 }
     *
     *   // remove a component
     *   delete e.poisioned
     * })
     * ```
     */
    update(entity: E, updateFnOrPartial: ((entity: E) => void) | Partial<E>): void;
    /**
     * Creates a query that updates with entity composition changes.
     * @param queryFn the query function
     * @returns the query instance
     *
     * @example
     * ```ts
     * const query = world.query((e) => e.has('position').and.has('velocity'))
     * ```
     *
     * @example
     * ```ts
     * const query = world.query((e) => e.has('position').but.not('dead'))
     * ```
     *
     * @example
     * ```ts
     * const query = world.query((e) => e.has('position').and.one('player', 'enemy'))
     * ```
     */
    query<ResultEntity extends E>(queryFn: QueryFn<E, ResultEntity>, options?: {
        handle: unknown;
    }): Query<ResultEntity>;
    /**
     * Destroys a Query
     * @param query the Query to remove
     * @returns
     */
    destroyQuery(query: Query<any>, options?: {
        handle: unknown;
    }): void;
    /**
     * Filters entities that match a given query.
     * @param queryFn the query to match
     * @returns entities matching the query
     */
    filter<ResultEntity>(queryFn: QueryFn<E, ResultEntity>): ResultEntity[];
    /**
     * Finds an entity that matches a given query
     * @param queryFn the query to match
     * @returns the first entity matching the query
     */
    find<ResultEntity>(queryFn: QueryFn<E, ResultEntity>): ResultEntity | undefined;
    /**
     * Removes all entities from the world.
     */
    clear(): void;
    /**
     * Indexes an entity.
     *
     * Avoid calling this method directly unless you know what you're doing.
     *
     * This is called automatically when:
     * - an entity is created
     * - a component is added or removed from an entity
     * - an entity is destroyed
     *
     * @param entity the entity to index
     * @param draft the draft entity that queries are evaluated against, defaults to entity
     * @returns
     */
    index(entity: E, draft?: E): void;
}
