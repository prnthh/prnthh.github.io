class Topic {
  listeners = new Set();
  add(handler) {
    this.listeners.add(handler);
    return () => this.remove(handler);
  }
  remove(handler) {
    this.listeners.delete(handler);
  }
  emit(...data) {
    for (const handler of this.listeners) {
      handler(...data);
    }
  }
  clear() {
    this.listeners.clear();
  }
}

class EntityCollection {
  entities = [];
  version = 0;
  onEntityAdded = new Topic();
  onEntityRemoved = new Topic();
  /** @ignore */
  _entityPositions = new Map();
  get first() {
    return this.entities[0];
  }
  get size() {
    return this.entities.length;
  }
  [Symbol.iterator]() {
    let index = this.entities.length;
    const result = {
      value: undefined,
      done: false
    };
    return {
      next: () => {
        result.value = this.entities[--index];
        result.done = index < 0;
        return result;
      }
    };
  }
  has(entity) {
    return this._entityPositions.has(entity);
  }
}
const addToCollection = (collection, entity) => {
  // assumes the entity is not already in the collection
  collection.entities.push(entity);
  collection._entityPositions.set(entity, collection.entities.length - 1);
  collection.version++;
  collection.onEntityAdded.emit(entity);
};
const removeFromCollection = (collection, entity) => {
  // assumes the entity is in the collection
  const index = collection._entityPositions.get(entity);
  collection._entityPositions.delete(entity);
  const other = collection.entities[collection.entities.length - 1];
  if (other !== entity) {
    collection.entities[index] = other;
    collection._entityPositions.set(other, index);
  }
  collection.entities.pop();
  collection.version++;
  collection.onEntityRemoved.emit(entity);
};

class Query extends EntityCollection {
  references = new Set();
  constructor(dedupe, conditions) {
    super();
    this.dedupe = dedupe;
    this.conditions = conditions;
  }
}
const prepareQuery = queryFn => {
  /* evaluate queryFn */
  const queryBuilder = new QueryBuilder();
  queryFn(queryBuilder);
  const queryBuilderConditions = queryBuilder.conditions;
  /* validate conditions */
  if (queryBuilderConditions.length <= 0) {
    throw new Error('Query must have at least one condition');
  }
  if (queryBuilderConditions.some(condition => condition.components.length <= 0)) {
    throw new Error('Query conditions must have at least one component');
  }
  /* normalize conditions */
  const normalisedConditions = [];
  const combinedAllCondition = {
    type: 'all',
    components: []
  };
  const combinedNotCondition = {
    type: 'not',
    components: []
  };
  for (const condition of queryBuilderConditions) {
    if (condition.type === 'all') {
      combinedAllCondition.components.push(...condition.components);
    } else if (condition.type === 'not') {
      combinedNotCondition.components.push(...condition.components);
    } else {
      normalisedConditions.push(condition);
    }
  }
  if (combinedAllCondition.components.length > 0) {
    normalisedConditions.push(combinedAllCondition);
  }
  if (combinedNotCondition.components.length > 0) {
    normalisedConditions.push(combinedNotCondition);
  }
  /* create query dedupe string */
  const dedupe = normalisedConditions.map(({
    type,
    components
  }) => {
    return `${type}(${components.sort().join(', ')})`;
  }).sort().join(' && ');
  return {
    conditions: normalisedConditions,
    dedupe
  };
};
const evaluateQueryConditions = (conditions, entity) => {
  for (let c = 0; c < conditions.length; c++) {
    const condition = conditions[c];
    if (condition.type === 'all' && !condition.components.every(c => entity[c] !== undefined) || condition.type === 'any' && !condition.components.some(c => entity[c] !== undefined) || condition.type === 'not' && condition.components.some(c => entity[c] !== undefined)) {
      return false;
    }
  }
  return true;
};
class QueryBuilder {
  conditions = [];
  /* conditions */
  all = (...components) => {
    this.conditions.push({
      type: 'all',
      components
    });
    return this;
  };
  any = (...components) => {
    this.conditions.push({
      type: 'any',
      components
    });
    return this;
  };
  not = (...components) => {
    this.conditions.push({
      type: 'not',
      components
    });
    return this;
  };
  /* condition aliases */
  with = this.all;
  have = this.all;
  has = this.all;
  every = this.all;
  is = this.all;
  some = this.any;
  one = this.any;
  none = this.not;
  without = this.not;
  /* no-op grammar */
  get and() {
    return this;
  }
  get but() {
    return this;
  }
  get where() {
    return this;
  }
  get are() {
    return this;
  }
}

const DEFAULT_QUERY_HANDLE = Symbol('standalone');
class World extends EntityCollection {
  queries = [];
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
  create(entity) {
    if (this.has(entity)) return entity;
    addToCollection(this, entity);
    this.index(entity);
    return entity;
  }
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
  destroy(entity) {
    if (!this.has(entity)) return;
    removeFromCollection(this, entity);
    /* remove entity from queries */
    this.queries.forEach(query => {
      if (query.has(entity)) {
        removeFromCollection(query, entity);
      }
    });
  }
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
  add(entity, component, value) {
    if (entity[component] !== undefined) return;
    entity[component] = value;
    this.index(entity);
  }
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
  remove(entity, component) {
    if (entity[component] === undefined) return;
    const draft = {
      ...entity
    };
    delete draft[component];
    this.index(entity, draft);
    delete entity[component];
  }
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
  update(entity, updateFnOrPartial) {
    const draft = {
      ...entity
    };
    if (typeof updateFnOrPartial === 'function') {
      updateFnOrPartial(draft);
    } else {
      Object.assign(draft, updateFnOrPartial);
    }
    const added = Object.keys(draft).filter(key => entity[key] === undefined);
    const removed = Object.keys(entity).filter(key => draft[key] === undefined);
    // commit additions before indexing
    for (const component of added) {
      entity[component] = draft[component];
    }
    this.index(entity, draft);
    // commit removals after indexing
    for (const component of removed) {
      delete entity[component];
    }
    Object.assign(entity, draft);
  }
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
  query(queryFn, options) {
    const {
      conditions,
      dedupe
    } = prepareQuery(queryFn);
    const handle = options?.handle ?? DEFAULT_QUERY_HANDLE;
    let query = this.queries.find(query => query.dedupe === dedupe);
    if (query) {
      query.references.add(handle);
      return query;
    }
    query = new Query(dedupe, conditions);
    query.references.add(handle);
    this.queries.push(query);
    /* populate query with existing entities */
    const matches = [];
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (evaluateQueryConditions(query.conditions, entity)) {
        matches.push(entity);
      }
    }
    for (let i = 0; i < matches.length; i++) {
      addToCollection(query, matches[i]);
    }
    return query;
  }
  /**
   * Destroys a Query
   * @param query the Query to remove
   * @returns
   */
  destroyQuery(query, options) {
    if (!this.queries.includes(query)) return;
    const handle = options?.handle ?? DEFAULT_QUERY_HANDLE;
    query.references.delete(handle);
    if (query.references.size > 0) return;
    const queryIndex = this.queries.indexOf(query);
    this.queries.splice(queryIndex, 1);
    query.onEntityAdded.clear();
    query.onEntityRemoved.clear();
  }
  /**
   * Filters entities that match a given query.
   * @param queryFn the query to match
   * @returns entities matching the query
   */
  filter(queryFn) {
    const {
      conditions,
      dedupe
    } = prepareQuery(queryFn);
    const query = this.queries.find(query => query.dedupe === dedupe);
    if (query) {
      return [...query.entities];
    }
    const matches = [];
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (evaluateQueryConditions(conditions, entity)) {
        matches.push(entity);
      }
    }
    return matches;
  }
  /**
   * Finds an entity that matches a given query
   * @param queryFn the query to match
   * @returns the first entity matching the query
   */
  find(queryFn) {
    const {
      conditions,
      dedupe
    } = prepareQuery(queryFn);
    const query = this.queries.find(query => query.dedupe === dedupe);
    if (query) {
      return query.first;
    }
    for (const entity of this.entities) {
      if (evaluateQueryConditions(conditions, entity)) {
        return entity;
      }
    }
    return undefined;
  }
  /**
   * Removes all entities from the world.
   */
  clear() {
    const entities = [...this.entities];
    for (let i = 0; i < entities.length; i++) {
      this.destroy(entities[i]);
    }
    this._entityPositions.clear();
  }
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
  index(entity, draft = entity) {
    if (!this.has(entity)) return;
    for (let q = 0; q < this.queries.length; q++) {
      const query = this.queries[q];
      const match = evaluateQueryConditions(query.conditions, draft);
      const has = query.has(entity);
      if (match && !has) {
        addToCollection(query, entity);
      } else if (!match && has) {
        removeFromCollection(query, entity);
      }
    }
  }
}

export { EntityCollection as EntityContainer, Query, QueryBuilder, Topic, World };
//# sourceMappingURL=index.mjs.map
