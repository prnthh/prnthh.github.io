---
name: react-three-game
description: A JSON-first scene mounting and authoring library on React Three Fiber. Prefabs, an editor, and a small Scene runtime API.
---

# react-three-game

JSON-first prefabs. Mount with `PrefabRoot`, author with `PrefabEditor`, register custom components with `registerComponent()`, and reach into the live scene with `useScene()`, `useNode()`, or `useEditorRef()`.

## Scope

- Author scenes as JSON `Prefab` trees.
- Mount with `PrefabRoot` or edit with `PrefabEditor`.
- Add custom logic by registering `Component`s and rendering normal R3F children inside the editor canvas.
- Read and mutate the live scene through one consistent surface: the `Scene` interface, exposed as `useScene()` (children of `PrefabEditor` / `PrefabRoot`) and `editorRef.current` (which extends `Scene`).

## Schema

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
  hidden?: boolean;
  children?: GameObject[];
  components?: Record<string, ComponentData | undefined>;
}

interface ComponentData {
  type: string;                       // TitleCase, e.g. "Transform"
  properties: Record<string, any>;
}
```

Conventions:

- Component map keys are camelCase (e.g. `transform`, `directionalLight`, `crashcatPhysics`).
- `type` is TitleCase and matches the registered `Component.name`.
- Transforms are local to the parent. Rotations are radians.
- Asset paths are relative to `/public`.
- New ids: `crypto.randomUUID()`.

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

## Mounting

### PrefabRoot — pure render

```tsx
import { GameCanvas, PrefabRoot } from 'react-three-game';

<GameCanvas>
  <PrefabRoot data={prefab} />
</GameCanvas>
```

Props: `data`, `editMode`, `selectedId`, `onSelect`, `onClick`, `onEditNodeClick`, `basePath`, `children`. `children` render inside the same scene context, so they can call `useScene()`.

### PrefabEditor — authoring UI

```tsx
import { PrefabEditor, PrefabEditorMode } from 'react-three-game';

<PrefabEditor
  initialPrefab={prefab}
  mode={PrefabEditorMode.Edit}
  onChange={setPrefab}
>
  {/* Optional R3F children that share the scene */}
</PrefabEditor>
```

Common props: `initialPrefab`, `mode`, `onChange`, `basePath`, `showUI`, `enableWindowDrop`, `canvasProps`, `uiPlugins`, `children`.

## The Scene API — one surface for everything

`Scene` is the runtime contract for both mounting components. It is exposed three ways:

| Where you are | How to get it |
|---|---|
| Inside `<PrefabEditor>` / `<PrefabRoot>` children | `const scene = useScene()` |
| Inside a registered component's `View` | `useScene()` (and `useNode()` for current-node sugar) |
| Outside the canvas, holding an editor ref | `editorRef.current` (extends `Scene`) |

```ts
interface Scene {
  // Reads
  root: Object3D | null;
  mode: PrefabEditorMode;
  get(id: string): GameObject | null;
  getObject(id: string): Object3D | null;
  getHandle<T = unknown>(id: string, kind: string): T | null;

  // Mutations
  add(node: GameObject, parentId?: string): GameObject;
  update(id: string, fn: (node: PrefabNode) => PrefabNode): void;
  remove(id: string): void;
  duplicate(id: string): string | null;
  move(draggedId: string, targetId: string, position: 'before' | 'inside'): void;
  replace(prefab: Prefab): void;

  // Asset injection
  addModel(path: string, model: Object3D): void;
  addTexture(path: string, texture: Texture): void;
  addSound(path: string, sound: AudioBuffer): void;
}
```

`PrefabEditorRef` adds: `save()`, `load(prefab, { resetHistory?, notifyChange? })`, `undo()`, `redo()`, `screenshot()`, `exportGLB()`, `exportGLBData()`, `clearSelection()`.

Examples:

```tsx
// As an editor ref outside the canvas
const editorRef = useRef<PrefabEditorRef>(null);

editorRef.current?.add({
  id: crypto.randomUUID(),
  components: {
    transform: { type: 'Transform', properties: { position: [0, 1, 0] } },
    geometry: { type: 'Geometry', properties: { geometryType: 'box' } },
  },
});

editorRef.current?.update('player', (node) => ({
  ...node,
  components: {
    ...node.components,
    transform: {
      type: 'Transform',
      properties: {
        ...node.components?.transform?.properties,
        position: [5, 0, 0],
      },
    },
  },
}));

const playerObject = editorRef.current?.getObject('player');
const playerHandle = editorRef.current?.getHandle('player', 'runtime');
```

```tsx
// As a hook inside a child of <PrefabEditor>
function FollowPlayerCamera() {
  const scene = useScene();
  useFrame(() => {
    const player = scene.getObject('player');
    if (player) console.log(player.position);
  });
  return null;
}
```

Guidance:

- Reach for `update()` when you want a change serialized into prefab JSON (snap to grid, gameplay-driven moves that should appear in `onChange`).
- Reach for `getObject()` for raw Three.js mutation that lives only at runtime (controllers, particle FX, debug overlays) — much cheaper than roundtripping through JSON every frame.
- Reach for `getHandle(id, kind)` to read another component's runtime-owned state.
- `replace()` and `editorRef.load()` swap the whole prefab; `replace()` skips history, `load({ resetHistory: true })` clears history.

## Custom components

Register before mounting `PrefabRoot` / `PrefabEditor`. A `Component` has a name, an `Editor` (inspector UI), an optional `View` (runtime), and `defaultProperties`.

```tsx
import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  FieldRenderer,
  registerComponent,
  useNode,
  type Component,
  type ComponentViewProps,
  type FieldDefinition,
} from 'react-three-game';

type RotatorProps = { speed?: number };

const fields: FieldDefinition[] = [
  { name: 'speed', type: 'number', label: 'Speed', step: 0.1 },
];

function RotatorView({ properties, children }: ComponentViewProps<RotatorProps>) {
  const { getObject, editMode } = useNode();
  useFrame((_, dt) => {
    if (editMode) return;
    getObject()?.rotateY((properties.speed ?? 1) * dt);
  });
  return <>{children}</>;
}

const Rotator: Component = {
  name: 'Rotator',
  Editor: ({ component, onUpdate }) => (
    <FieldRenderer fields={fields} values={component.properties} onChange={onUpdate} />
  ),
  View: RotatorView,
  defaultProperties: { speed: 1 },
};

registerComponent(Rotator);
```

`ComponentViewProps<P>` gives you `{ properties, children, position?, rotation?, scale? }`. The `position`/`rotation`/`scale` props are the node's local transform — useful if you want to render your own primary mesh instead of relying on the renderer's special-cased Geometry/Material/Model path.

### Composition rules

`PrefabRoot` owns the wrapper transform plus three primary-content special cases (`Geometry`/`BufferGeometry` + `Material`, and non-instanced `Model`). Every other `View` composes by **wrapping the current subtree**: the `children` prop you receive contains everything below your component in the composition order. Render `<>{children}</>` (or wrap them in a `<group>`) so the subtree mounts.

### Field types

`number`, `string`, `boolean`, `select`, `vector3`, `color`, `node` (searchable picker over the current prefab's nodes).

### Cross-node access

```tsx
function ElevatorView({ properties }: ComponentViewProps<{ platformId: string }>) {
  const scene = useScene();
  useFrame(() => {
    scene.getObject(properties.platformId)?.position.set(0, 4, 0);
  });
  return null;
}
```

### Per-node imperative handles

Expose a runtime handle so other code can drive the node without scene traversal:

```tsx
function SpinnerView({ properties, children }: ComponentViewProps<{}>) {
  const { nodeId } = useNode();
  const { registerHandle } = useAssetRuntime();

  useEffect(() => {
    const handle = { setSpeed(n: number) { /* ... */ } };
    registerHandle(nodeId, 'spinner', handle);
    return () => registerHandle(nodeId, 'spinner', null);
  }, [nodeId, registerHandle]);

  return <>{children}</>;
}

// elsewhere:
const handle = scene.getHandle<{ setSpeed(n: number): void }>('spinner-1', 'spinner');
handle?.setSpeed(2);
```

### Hook reference (inside a `View`)

| Hook | Returns |
|---|---|
| `useNode()` | `{ nodeId, editMode, isSelected, getObject<T>(), getHandle<T>(kind) }` |
| `useNodeObject<T>()` | `LiveRef<T>` for the current node's `Object3D` (read as `ref.current`) |
| `useNodeHandle<T>(kind)` | `LiveRef<T>` for a runtime handle on the current node |
| `useScene()` | The full `Scene` (use for cross-node work, mutations, asset injection) |
| `useAssetRuntime()` | `{ registerHandle, getHandle, getObject, getModel, getTexture, getSound, getAssetRevision }` |
| `useEditorRef()` | The full `PrefabEditorRef` if mounted under `<PrefabEditor>` |
| `useFrame`, `useThree` | Native R3F |

## Built-in components

`Transform`, `Data`, `Geometry`, `BufferGeometry`, `Material`, `Model`, `AmbientLight`, `PointLight`, `SpotLight`, `DirectionalLight`, `Environment`, `Camera`, `Text`, `Sound`.

`Data` merges `properties.data` into the mounted `Object3D.userData` (reserved keys like `prefabNodeId` and `prefabNodeName` are protected). Use it for small bits of authored metadata; prefer first-class custom components for systems with their own behavior.

## Sound

```json
{
  "id": "machine-hum",
  "components": {
    "sound": {
      "type": "Sound",
      "properties": {
        "clips": ["/sound/machine-hum.mp3"],
        "autoplay": true,
        "loop": true,
        "positional": true,
        "refDistance": 2,
        "maxDistance": 20,
        "volume": 0.35
      }
    }
  }
}
```

Properties: `clips`, `eventName`, `autoplay`, `loop`, `positional`, `clipMode` (`single` | `random` | `sequence`), `pitch`, `volume`, `randomizePitch`, `randomizeVolume`, `refDistance`, `maxDistance`, `rolloffFactor`, `distanceModel`.

When `eventName` is set, the component subscribes to `gameEvents[eventName]` and plays one shot. Routing fields on the payload (`nodeId`, `sourceEntityId`, `sourceNodeId`, `targetEntityId`, `targetNodeId`, `instanceEntityId`) act as a filter: include the Sound component's own node id to target it directly, or omit all routing fields to broadcast to every listener.

## Events

`gameEvents` is the in-app event bus. Components and runtime systems publish and subscribe through it.

```tsx
import { gameEvents, useGameEvent, useClickEvent } from 'react-three-game';

useClickEvent('cannon:fire', (payload) => {
  console.log('fire', payload.sourceEntityId);
}, []);

const stop = gameEvents.on('target:hit', (payload) => { /* ... */ });
```

`Geometry`, `BufferGeometry`, and `Model` accept `emitClickEvent: true` + `clickEventName: "..."` to publish click events with a standard `ClickEventPayload`.

## Direct store access

For UI/state outside the canvas that needs to react to authored data:

```tsx
import { usePrefabStore, usePrefabStoreApi } from 'react-three-game';

const selected = usePrefabStore(s => s.nodesById['player']);
const store = usePrefabStoreApi();
const unsub = store.subscribe(s => s.nodesById['player'], () => { /* ... */ });
```

## Repo workflow

- `/src` — published library.
- `/docs` — Next.js docs app, links the local library.
- `npm run dev` — TypeScript watch + docs dev server.
- `npm run build` — emit `/dist`.

## Useful exports

Values: `GameCanvas`, `PrefabRoot`, `PrefabEditor`, `PrefabEditorMode`, `registerComponent`, `gameEvents`, `useGameEvent`, `useClickEvent`, `useScene`, `useNode`, `useNodeObject`, `useNodeHandle`, `useAssetRuntime`, `useEditorRef`, `useEditorContext`, `usePrefabStore`, `usePrefabStoreApi`, `FieldRenderer`, `Vector3Field`, `NumberField`, `StringField`, `BooleanField`, `SelectField`, `ColorField`, `loadFiles`, `loadModel`, `loadSound`, `loadTexture`, `exportGLB`, `exportGLBData`, `regenerateIds`, `computeParentWorldMatrix`, `findComponent`, `findComponentEntry`, `hasComponent`, `createModelNode`, `createImageNode`, `denormalizePrefab`, `ground`, `soundManager`.

Types: `Prefab`, `GameObject`, `ComponentData`, `PrefabNode`, `PrefabEditorRef`, `PrefabEditorProps`, `PrefabRootProps`, `Scene`, `Component`, `ComponentViewProps`, `FieldDefinition`, `FieldType`, `NodeApi`, `LiveRef`, `AssetRuntime`, `PrefabStoreState`, `PrefabStoreApi`, `GameEventMap`, `ClickEventPayload`, `ContactEventPayload`, `LoadedModels`, `LoadedTextures`, `LoadedSounds`.

## Style

- Stay JSON-first. Authored state lives in prefab components; runtime state lives in component `View`s, registered handles, or external systems mounted as children of the editor.
- Let the renderer own the wrapper transform and the Geometry/Material/Model special-case content.
- Reach for `useScene()` and `editorRef` for authored-node lookup; they are faster and more direct than scene traversal.
- Hook names follow the `useNode*` family, and mutations live on `Scene` as `add` / `update` / `remove` / `duplicate` / `move` / `replace`.
