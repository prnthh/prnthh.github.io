---
name: react-three-game
description: react-three-game, a JSON-first 3D game engine built on React Three Fiber, WebGPU, and Rapier Physics.
---

# react-three-game

Reference for scenes, prefabs, custom components, and runtime scene mutation in `react-three-game`.

## Scope

- Build JSON prefabs and scene graphs.
- Render prefabs with `PrefabRoot`.
- Edit scenes with `PrefabEditor`.
- Add custom components with `registerComponent()`.
- Mutate authored scenes through the `Scene` API.

## Schema

JSON prefab with a single root node.

```ts
interface Prefab {
  id?: string;
  name?: string;
  root: GameObject;
}

interface GameObject {
  id: string;
  name?: string;
  disabled?: boolean;
  locked?: boolean;
  children?: GameObject[];
  components?: Record<string, ComponentData | undefined>;
}

interface ComponentData {
  type: string;
  properties: Record<string, any>;
}
```

Conventions:

- Component keys are lowercase in JSON.
- Component `type` names are TitleCase.
- Transforms are local to the parent.
- Rotations use radians.
- Asset paths are relative to `/public`.
- Use `crypto.randomUUID()` for new node ids.

Example:

```json
{
  "root": {
    "id": "scene",
    "children": [
      {
        "id": "crate",
        "components": {
          "transform": { "type": "Transform", "properties": { "position": [0, 1, 0] } },
          "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [1, 1, 1] } },
          "material": { "type": "Material", "properties": { "color": "#c97316" } }
        }
      }
    ]
  }
}
```

## Rendering model

`PrefabRoot` composition rules:

- `Transform` is applied by the renderer as the node's outer transform.
- `Geometry` + `Material` are special-cased into the node's primary mesh content.
- `Model` is also special-cased as primary content when non-instanced.
- `Physics` is a renderer-owned outer wrapper.
- Every other component `View` composes around the current subtree by default.
- A component can opt into `composition: "sibling"` if it must render next to the subtree instead of wrapping it.

Implications:

- Components like `Environment` should usually wrap, because `<Environment>{children}</Environment>` uses children to generate the envmap.
- Do not reintroduce broad special-case composition in custom components when the default wrap behavior is enough.

## PrefabRoot

Pure prefab rendering inside an R3F scene.

```tsx
import { Physics } from '@react-three/rapier';
import { GameCanvas, PrefabRoot } from 'react-three-game';

<GameCanvas>
  <Physics>
    <PrefabRoot data={prefabData} />
  </Physics>
</GameCanvas>
```

Props:

- `data?: Prefab`
- `store?: PrefabStoreApi`
- `editMode?: boolean`
- `selectedId?: string | null`
- `onSelect?: (id: string | null) => void`
- `onClick?: (event, entity) => void`
- `onObjectRefChange?: (id, object) => void`
- `basePath?: string`

Use `data` for static prefab input. Use `store` when state is owned externally.

## PrefabEditor

Managed authoring UI with history, selection, inspector editing, and play/edit mode.

```tsx
import { PrefabEditor } from 'react-three-game';

<PrefabEditor
  initialPrefab={prefabData}
  onChange={setPrefabData}
/>
```

Notes:

- Use `onChange` to receive prefab updates.
- `mode` is `edit` or `play`.
- Physics is enabled in play mode and paused in edit mode.
- `children` render inside the editor canvas.

Editor ref:

```ts
editorRef.current?.save();
editorRef.current?.load(prefab, { resetHistory: true });
editorRef.current?.exportGLB();
editorRef.current?.exportGLBData();
editorRef.current?.screenshot();
editorRef.current?.scene;
```

## Scene API

Live imperative scene handle exposed by `PrefabEditorRef`.

```tsx
const scene = editorRef.current?.scene;

scene?.find('player')?.getComponent('Transform')?.set('position', [5, 0, 0]);
scene?.find('player')?.getComponent('Transform')?.update(props => ({
  ...props,
  position: [props.position[0] + 1, props.position[1], props.position[2]],
}));

scene?.update('enemy', node => ({ ...node, disabled: true }));
scene?.create('Cube', {
  geometry: { type: 'Geometry', properties: { geometryType: 'box' } },
});
scene?.add(node, { parentId: 'root' });
scene?.remove('enemy');
```

Preferred mutation surface:

- `component.set(path, value)` for focused property writes.
- `component.update(fn)` when next state depends on previous state.
- `scene.update(id, fn)` for whole-node changes.

## Runtime access

Use the narrowest surface that matches the operation.

### 1. Inside a component `View`

Runtime hooks.

- `useEntityRuntime()` for `editMode`, `nodeId`, and live getters.
- `useEntityObjectRef()` when you need the current `Object3D`.
- `useEntityRigidBodyRef()` when you need raw Rapier body methods.
- `useAssetRuntime().getObject(nodeId)` or `useAssetRuntime().getRigidBody(nodeId)` when the current component needs to target another authored node in the same prefab.

Node-local surface for custom components.

Rules:

- Use `useEntityObjectRef()` / `useEntityRigidBodyRef()` for the current node only.
- Use `useAssetRuntime()` lookups for authored cross-node gameplay logic like elevators, doors, linked sensors, or moving platforms.
- Do not use `useEditorContext()` for scene access. It is editor UI state, not runtime scene lookup.

### 2. Outside component views, but still operating on authored prefab nodes

`Scene` API.

- Use `scene.find(id)?.getComponent(name)` for property edits.
- Use `scene.update(id, fn)` for whole-node mutations.
- Use `scene.create()` / `scene.add()` / `scene.remove()` for lifecycle changes.

Primary surface for editor children, gameplay controllers, and app-level scene logic.

### 3. Drop to `entity.object` or `entity.rigidBody` only when needed

Use `scene.find(id)?.object` or `scene.find(id)?.rigidBody` only for capabilities not exposed by component/property mutation:

- reading world position or world rotation
- calling raw Rapier methods like `applyImpulse()`
- integrating with lower-level Three.js APIs

Rules:

- If you are setting authored component properties, prefer `getComponent().set()` or `update()`.
- If you need world-space transforms or physics engine methods, use `object` or `rigidBody`.
- Avoid using raw object/body access when a typed component mutation is enough.

## Custom components

Register before rendering `PrefabRoot` or `PrefabEditor`.

```tsx
import { FieldRenderer, registerComponent, type Component, type FieldDefinition } from 'react-three-game';

const fields: FieldDefinition[] = [
  { name: 'speed', type: 'number', label: 'Speed', step: 0.1 },
];

const Rotator: Component = {
  name: 'Rotator',
  Editor: ({ component, onUpdate }) => (
    <FieldRenderer fields={fields} values={component.properties} onChange={onUpdate} />
  ),
  View: ({ children }) => <group>{children}</group>,
  defaultProperties: { speed: 1 },
};

registerComponent(Rotator);
```

Field types:

- `number`
- `string`
- `boolean`
- `select`
- `vector3`
- `color`
- `node` for authored node ids with searchable name/id suggestions from the current prefab
- `event` for event names with built-in and authored event suggestions

Cross-node pattern inside a `View`:

```tsx
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  FieldRenderer,
  gameEvents,
  type Component,
  type FieldDefinition,
  type PhysicsEventPayload,
  useAssetRuntime,
  useEntityRuntime,
} from 'react-three-game';

const fields: FieldDefinition[] = [
  { name: 'platformNodeId', type: 'node', label: 'Platform Node' },
  { name: 'triggerEventName', type: 'event', label: 'Trigger Event' },
];

function ElevatorMoverView({ properties, children }: { properties: any; children?: React.ReactNode }) {
  const { nodeId, editMode } = useEntityRuntime();
  const { getRigidBody } = useAssetRuntime();
  const activeRef = useRef(false);

  useEffect(() => {
    if (!properties.triggerEventName) return;

    return gameEvents.on(properties.triggerEventName, (payload) => {
      const event = payload as PhysicsEventPayload;
      if (event.sourceEntityId !== nodeId) return;
      if (event.targetEntityId !== 'player') return;
      activeRef.current = true;
    });
  }, [nodeId, properties.triggerEventName]);

  useFrame(() => {
    if (editMode || !activeRef.current) return;
    const rigidBody = getRigidBody(properties.platformNodeId);
    rigidBody?.setTranslation({ x: 0, y: 4, z: 0 }, true);
  });

  return <>{children}</>;
}
```

Composition:

- The default component behavior is to wrap the current subtree.
- Only use `composition: "sibling"` when the component truly must render alongside the subtree.
- Prefer keeping custom `View` implementations structurally naive and letting `PrefabRoot` own geometry/material/model/physics special cases.

## Built-in components

- `Transform`: local `position`, `rotation`, `scale`
- `Geometry`: `geometryType`, `args`
- `Material`: `color`, `texture`, `metalness`, `roughness`, `repeat`, `repeatCount`, normal map options
- `Physics`: rigid body and collider settings, sensor and collision events
- `Model`: `filename`, `instanced`, repeat axes
- `AmbientLight`
- `PointLight`
- `SpotLight`
- `DirectionalLight`
- `Environment`
- `Camera`
- `Text`
- `Click`
- `Sound`

## Events

Built-in event names:

- `click`
- `sensor:enter`
- `sensor:exit`
- `collision:enter`
- `collision:exit`

Example:

```json
{
  "click": { "type": "Click", "properties": { "eventName": "door:open" } },
  "sound": { "type": "Sound", "properties": { "eventName": "door:open", "clips": ["/sound/door-open.mp3"] } }
}
```

Built-in physics event payload shape:

```ts
type PhysicsEventPayload = {
  sourceEntityId: string;
  targetEntityId: string | null;
  targetRigidBody: RapierRigidBody | null | undefined;
};
```

Physics event payload fields:

- `sourceEntityId`: the node that owns the sensor or collider
- `targetEntityId`: the other prefab-authored entity, if available
- `targetRigidBody`: raw access to the other body when needed

## Useful exports

Values:

- `GameCanvas`
- `PrefabRoot`
- `PrefabEditor`
- `PrefabEditorMode`
- `registerComponent`
- `useEditorContext`
- `createPrefabStore`
- `prefabStoreToPrefab`
- `usePrefabStoreApi`
- `createScene`
- `denormalizePrefab`
- `createModelNode`
- `createImageNode`
- `findComponent`
- `findComponentEntry`
- `hasComponent`
- `gameEvents`
- `useGameEvent`
- `loadFiles`
- `loadModel`
- `loadSound`
- `loadTexture`
- `exportGLB`
- `exportGLBData`
- `computeParentWorldMatrix`
- `ground`
- `soundManager`

Types:

- `Prefab`
- `GameObject`
- `ComponentData`
- `Component`
- `ComponentViewProps`
- `PrefabRootProps`
- `PrefabEditorProps`
- `PrefabEditorRef`
- `Scene`
- `Entity`
- `EntityComponent`
- `PrefabStoreApi`
- `PrefabStoreState`
- `FieldDefinition`
- `FieldType`

## Constraints

- Preserve the JSON-first scene model.
- Prefer minimal prefab edits over broad rewrites.
- Keep custom components simple; let the renderer own transform, geometry/material, model, and physics behavior.
- Prefer the `Scene` API for targeted live updates instead of rebuilding entire prefabs.
- When documenting or generating examples, use the current API names exactly as exported.


