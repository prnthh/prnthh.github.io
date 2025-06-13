import { EntityCollection } from './entity-collection';
export type With<T, P extends keyof T> = T & Required<Pick<T, P>>;
export type Without<T, P extends keyof T> = Pick<T, Exclude<keyof T, P>> & Partial<Pick<T, P>>;
export type Strict<T> = WithoutOptionalProperties<T>;
type OptionalProperties<T> = {
    [P in keyof T]-?: undefined extends T[P] ? P : never;
};
type WithoutOptionalProperties<T> = Pick<T, Exclude<keyof T, OptionalProperties<T>[keyof T]>>;
export type QueryConditionType = 'all' | 'any' | 'not';
export type QueryCondition<Entity> = {
    type: QueryConditionType;
    components: (keyof Entity)[];
};
export type QueryConditions<Entity> = QueryCondition<Entity>[];
export type QueryFn<Entity, ResultEntity> = (q: QueryBuilder<Entity>) => QueryBuilder<ResultEntity>;
export declare class Query<Entity> extends EntityCollection<Entity> {
    dedupe: string;
    conditions: QueryConditions<Entity>;
    references: Set<unknown>;
    constructor(dedupe: string, conditions: QueryConditions<Entity>);
}
export declare const prepareQuery: (queryFn: QueryFn<any, any>) => {
    conditions: QueryConditions<any>;
    dedupe: string;
};
export declare const evaluateQueryConditions: <Entity>(conditions: QueryConditions<Entity>, entity: Entity) => boolean;
export declare class QueryBuilder<Entity> {
    T: Entity;
    conditions: QueryConditions<Entity>;
    all: <C extends keyof Entity>(...components: C[]) => QueryBuilder<With<Entity, C>>;
    any: <C extends keyof Entity>(...components: C[]) => QueryBuilder<Entity>;
    not: <C extends keyof Entity>(...components: C[]) => QueryBuilder<Without<Entity, C>>;
    with: <C extends keyof Entity>(...components: C[]) => QueryBuilder<With<Entity, C>>;
    have: <C extends keyof Entity>(...components: C[]) => QueryBuilder<With<Entity, C>>;
    has: <C extends keyof Entity>(...components: C[]) => QueryBuilder<With<Entity, C>>;
    every: <C extends keyof Entity>(...components: C[]) => QueryBuilder<With<Entity, C>>;
    is: <C extends keyof Entity>(...components: C[]) => QueryBuilder<With<Entity, C>>;
    some: <C extends keyof Entity>(...components: C[]) => QueryBuilder<Entity>;
    one: <C extends keyof Entity>(...components: C[]) => QueryBuilder<Entity>;
    none: <C extends keyof Entity>(...components: C[]) => QueryBuilder<Without<Entity, C>>;
    without: <C extends keyof Entity>(...components: C[]) => QueryBuilder<Without<Entity, C>>;
    get and(): this;
    get but(): this;
    get where(): this;
    get are(): this;
}
export {};
