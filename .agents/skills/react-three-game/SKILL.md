---
name: react-three-game
description: react-three-game, a JSON-first prefab mounting and authoring library built on React Three Fiber and external runtime integrations.
---

# react-three-game

Reference for prefabs, prefab mounting, custom components, and direct mounted Three.js object access in `react-three-game`.

## Scope

- Build JSON prefabs and node trees.
- Render prefabs with `PrefabRoot`.
- Edit prefabs with `PrefabEditor`.
- Add custom components with `registerComponent()`.
- Mutate authored prefabs through the editor ref.
- Integrate external runtimes through prefab refs, handles, and `onSceneChange` subscriptions.

## Repo workflow

- `/src` contains the published library source.
- `/docs` is the Next.js docs app and consumes the library via the local package link.
- `npm run dev` runs TypeScript watch for the library and the docs app together.
- `npm run build` emits the library to `/dist`.

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
- `Geometry` or `BufferGeometry` + `Material` are special-cased into the node's primary mesh content.
- `Model` is also special-cased as primary content when non-instanced.
- Every other component `View` composes by wrapping the current subtree.

Implications:

- Components like `Environment` wrap the subtree and use `children` to generate the envmap.
- Renderer-owned transforms and primary mesh content should stay in `PrefabRoot`, not be reimplemented in custom components.

## PrefabRoot

Pure prefab rendering inside an R3F scene.

```tsx
import { GameCanvas, PrefabRoot } from 'react-three-game';

<GameCanvas>
  <PrefabRoot data={prefabData} />
</GameCanvas>
```

Props:

- `data?: Prefab`
- `editMode?: boolean`
- `selectedId?: string | null`
- `onSelect?: (id: string | null) => void`
- `onClick?: (event, node) => void` for play/runtime clicks
- `onEditNodeClick?: (event, node) => void` for edit-mode clicks
- `basePath?: string`

Use `data` for static prefab input.

Native hooks:

- Components rendered under the same `Canvas` can use `useThree()` and `useFrame()`.
- Use `react-three-game` runtime helpers for authored-node lookup by prefab id.
- Use native hooks for camera access, scene state, viewport size, and render-loop work.

PrefabRoot ref:

```tsx
import { useRef } from 'react';
import { GameCanvas, PrefabRoot, type PrefabRootRef } from 'react-three-game';

function PrefabView() {
  const prefabRootRef = useRef<PrefabRootRef>(null);

  const root = prefabRootRef.current?.root;
  const playerObject = prefabRootRef.current?.getNodeObject('player');
  const runtimeHandle = prefabRootRef.current?.getNodeHandle('player', 'runtime');

  return (
    <GameCanvas>
      <PrefabRoot ref={prefabRootRef} data={prefabData} />
    </GameCanvas>
  );
}
```

Guidance:

- Use a normal React `ref` to get the `PrefabRootRef` handle.
- `root` is the mounted Three `Group` for traversal and scene-native queries.
- `getNodeObject(id)` returns the canonical Three `Object3D` for an authored node.
- `getNodeHandle(id, kind)` returns a runtime-owned handle registered for that node and kind.

Custom authored mesh example:

```json
{
  "id": "triangle",
  "components": {
    "bufferGeometry": {
      "type": "BufferGeometry",
      "properties": {
        "positions": [0, 0, 0, 1, 0, 0, 0, 1, 0],
        "indices": [0, 1, 2],
        "uvs": [0, 0, 1, 0, 0, 1]
      }
    },
    "material": {
      "type": "Material",
      "properties": {
        "texture": "textures/proto32/grid.png",
        "repeat": true,
        "repeatCount": [2, 2],
        "offset": [0, 0],
        "animateOffset": true,
        "offsetSpeed": [0.25, 0]
      }
    }
  }
}
```

## Sound component

Use the built-in `Sound` component in prefab JSON when you want authored sound playback.

Supports:

- `clips`: one or more sound asset paths.
- `eventName`: play from a game event.
- `autoplay`: start playback automatically in play mode.
- `loop`: keep the clip looping.
- `positional`: enable spatial playback attached to the node.
- `clipMode`: `single`, `random`, or `sequence` clip selection.
- `pitch` / `volume`: fixed playback tuning.
- `randomizePitch` / `randomizeVolume`: variation ranges for one-shots or autoplay start.

Notes:

- Sound assets should be relative to `/public`, for example `/sound/hit.mp3`.
- Sound clips are discovered through prefab asset refs and loaded by `PrefabRoot`'s asset layer before playback.
- Positional mode uses a `PositionalAudio` node attached to the authored object.
- Non-positional mode still uses the same playback path, but with flat attenuation settings.
- `eventName` is good for one-shots like footsteps, hits, and triggers.
- `autoplay` + `loop` is good for ambient beds, machinery, water, and room tone.

Example:

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
- `children` render inside the editor canvas.

Editor ref:

```ts
editorRef.current?.root;
editorRef.current?.getNodeObject('player');
editorRef.current?.getNodeHandle('player', 'runtime');
editorRef.current?.onSceneChange((revision) => console.log(revision));
editorRef.current?.addNode(node, { parentId: 'root' });
editorRef.current?.updateNode('player', update);
editorRef.current?.updateNodes(updates);
editorRef.current?.save();
editorRef.current?.load(prefab, { resetHistory: true });
editorRef.current?.exportGLB();
editorRef.current?.exportGLBData();
editorRef.current?.screenshot();
```

## Direct runtime access

Use the surface that matches where you are operating.

```tsx
const root = editorRef.current?.root;
const object = editorRef.current?.getNodeObject('player');
const runtime = editorRef.current?.getNodeHandle('player', 'runtime');
const playerByName = root?.getObjectByName('Player');
const playerByMetadata = root?.getObjectByProperty('userData.prefabNodeId', 'player');

editorRef.current?.updateNode('player', (node) => ({
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

editorRef.current?.addNode({
  id: crypto.randomUUID(),
  name: 'Cube',
  components: {
    transform: { type: 'Transform', properties: { position: [0, 1, 0] } },
    geometry: { type: 'Geometry', properties: { geometryType: 'box' } },
  },
});

prefabRootRef.current?.getNodeObject('player')?.position.set(0, 2, 0);
void runtime;
```

Guidance:

- Use `updateNode()` or `updateNodes()` when you want authored data changes that stay serializable.
- Use `getNodeObject()` when you want raw Three.js methods.
- Use `getNodeHandle()` when an external runtime has registered a node-local handle.
- Use `addNode()` for spawning authored nodes into the current prefab.
- Mounted wrapper `Object3D`s mirror authored metadata: `GameObject.id` -> `object.userData.prefabNodeId`, and `GameObject.name` -> `object.name` plus `object.userData.prefabNodeName`.
- A `Data` component can author extra `object.userData` fields through `properties.data`.
- Native traversal like `root.getObjectByName(name)` is convenient, but names are not guaranteed unique; prefer `getNodeObject(id)` or `root.getObjectByProperty('userData.prefabNodeId', id)` when you need a stable authored-node reference.

`onSceneChange` subscriptions:

- `onSceneChange(listener)` is the clearest editor-side signal for authored edits.
- Use it for edit-mode runtime re-sync work like rebuilding external colliders or refresh-once derived data.
- Keep heavy rebuilds event-driven instead of polling every frame.

Runtime-handle example:

```tsx
import { useEffect } from 'react';
import {
  useAssetRuntime,
  useCurrentNodeHandle,
  useCurrentNode,
} from 'react-three-game';

function SpinnerView({ children }: { children?: React.ReactNode }) {
  const { nodeId } = useCurrentNode();
  const { registerNodeHandle } = useAssetRuntime();

  useEffect(() => {
    const handle = {
      setSpeed(next: number) {
        console.log('speed', next);
      },
    };

    registerNodeHandle(nodeId, 'spinner', handle);
    return () => registerNodeHandle(nodeId, 'spinner', null);
  }, [nodeId, registerNodeHandle]);

  return <>{children}</>;
}

function SpinnerStatus() {
  const spinnerRef = useCurrentNodeHandle<{ setSpeed: (next: number) => void }>('spinner');

  useEffect(() => {
    spinnerRef.current?.setSpeed(2);
  }, [spinnerRef]);

  return null;
}
```

## Runtime access

Use the matching runtime surface for each operation.

### 1. Inside a component `View`

Runtime hooks.

- `useCurrentNode()` for `editMode`, `nodeId`, and live getters.
- `useCurrentNodeObject()` when you need the current node's mounted `Object3D`.
- `useCurrentNodeHandle(kind)` when you need a live handle registered for the current node.
- `useAssetRuntime().getNodeObject(nodeId)` or `useAssetRuntime().getNodeHandle(nodeId, kind)` when the current component needs to target another authored node in the same prefab.
- `useAssetRuntime().registerNodeHandle(nodeId, kind, handle)` when a component needs to expose runtime state back to the tree.

Node-local surface for custom components.

Guidance:

- `useCurrentNodeObject()` and `useCurrentNodeHandle()` access the current node.
- Both hooks return live ref-like objects, so read them as `objectRef.current` and `handleRef.current`.
- `useCurrentNodeObject<T>()` is generic. Use `useCurrentNodeObject<Mesh>()` when you want mesh methods and mesh-specific properties on the current node object.
- `useAssetRuntime()` looks up other authored nodes for gameplay logic like elevators, doors, linked sensors, and moving platforms.
- `useCurrentNode()` and `useAssetRuntime()` are the runtime lookup surfaces inside component views.
- `useThree()` is the right tool for camera, scene, viewport, pointer, raycaster, and renderer state.

Current node object and handle refs:

```tsx
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { useCurrentNode, useCurrentNodeHandle, useCurrentNodeObject } from 'react-three-game';

function BounceView({ children }: { children?: React.ReactNode }) {
  const meshRef = useCurrentNodeObject<Mesh>();
  const runtimeHandleRef = useCurrentNodeHandle<{ active: boolean }>('runtime');
  const { editMode } = useCurrentNode();

  useFrame(() => {
    if (editMode) return;

    meshRef.current?.rotateY(0.02);
    void runtimeHandleRef.current;
  });

  return <>{children}</>;
}
```

Ref selection rule:

- Use `useCurrentNodeObject()` for the mounted Three object of the current authored node.
- Use `useCurrentNodeHandle()` for the current authored node's runtime handle.
- If the node renders a mesh, type the object ref as `Mesh`.
- If you need another authored node instead of the current one, use `useAssetRuntime().getNodeObject(id)` or `useAssetRuntime().getNodeHandle(id, kind)`.

Native hooks example inside a custom component:

```tsx
import { useFrame, useThree } from '@react-three/fiber';
import { useCurrentNode, useCurrentNodeObject } from 'react-three-game';

function LookAtCameraView({ children }: { children?: React.ReactNode }) {
  const { camera } = useThree();
  const objectRef = useCurrentNodeObject();
  const { editMode } = useCurrentNode();

  useFrame(() => {
    if (editMode) return;
    objectRef.current?.lookAt(camera.position);
  });

  return <>{children}</>;
}
```

### 2. Outside component views, while operating on authored prefab nodes

Use the `PrefabEditorRef` or `PrefabRootRef` directly.

- Use `editorRef.current?.updateNode()` or `updateNodes()` for authored prefab mutations.
- Use `editorRef.current?.addNode()` for lifecycle changes.
- Use `editorRef.current?.getNodeObject(id)` and `getNodeHandle(id, kind)` for runtime access.
- Use `prefabRootRef.current?.getNodeObject(id)` and `getNodeHandle(id, kind)` when you are mounting with `PrefabRoot` only.

### 3. Use native Three.js objects and external runtime handles directly

Use `getNodeObject(id)` or `getNodeHandle(id, kind)` for capabilities provided directly by Three.js or your runtime:

- reading world position or world rotation
- syncing authored nodes into an external runtime
- integrating with lower-level Three.js APIs

Guidance:

- Store mutations write authored component properties.
- `object` is the canonical Three.js scene object for the node.
- `handle` is the runtime-owned imperative surface for a node when one is registered.
- This split keeps lower-level integrations straightforward: custom raycasts, runtime sync, and traversal-based tagging can work directly on normal Three objects without engine-owned wrappers getting in the way.

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

Cross-node pattern inside a `View`:

```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  FieldRenderer,
  type Component,
  type FieldDefinition,
  useAssetRuntime,
  useCurrentNode,
} from 'react-three-game';

const fields: FieldDefinition[] = [
  { name: 'platformNodeId', type: 'node', label: 'Platform Node' },
];

function ElevatorMoverView({ properties, children }: { properties: any; children?: React.ReactNode }) {
  const { editMode } = useCurrentNode();
  const { getNodeObject } = useAssetRuntime();
  const activeRef = useRef(true);

  useFrame(() => {
    if (editMode || !activeRef.current) return;
    const platform = getNodeObject(properties.platformNodeId);
    platform?.position.set(0, 4, 0);
  });

  return <>{children}</>;
}
```

Composition:

- The default component behavior is to wrap the current subtree.
- Custom `View` implementations compose around `children`, while `PrefabRoot` owns transform, geometry/material, and model special cases.

## Built-in components

- `Transform`: local `position`, `rotation`, `scale`
- `Data`: authored metadata merged onto `object.userData`
- `Geometry`: `geometryType`, `args`
- `BufferGeometry`: custom `positions`, `indices`, optional `normals`, `uvs`; default triangle includes UVs
- `Material`: `color`, `texture`, `metalness`, `roughness`, `repeat`, `repeatCount`, `offset`, `animateOffset`, `offsetSpeed`, normal map options
- `Model`: `filename`, `instanced`, repeat axes
- `AmbientLight`
- `PointLight`
- `SpotLight`
- `DirectionalLight`
- `Environment`
- `Camera`
- `Text`
- `Sound`: clips and playback settings, optional `gameEvents` listener via `eventName`

## Contributor notes

- WebGPU materials should use node materials like `MeshStandardNodeMaterial` or `MeshBasicNodeMaterial`, not classic `MeshStandardMaterial`.
- Public exports in `src/index.ts` stay explicit; avoid `export *` from the package entrypoint.
- Asset paths in authored prefab data are relative to `/public`.
- `usePrefabNode(id)` and `usePrefabChildIds(id)` are the per-node subscription pattern inside renderer code.
- New components should be added by creating the file, exporting it from `components/index.ts`, and then relying on the registry path already used by `PrefabRoot`.

## Event bus

Renderable and authored components emit through the shared `gameEvents` bus.

- `Geometry` and `BufferGeometry` can emit named click events through `gameEvents`.
- `Sound` can subscribe to an event name and play when that bus event fires.
- `useGameEvent()` and `useClickEvent()` are the standard React subscription surfaces.
- For custom interaction models like center-screen raycasts or look-to-interact, prefer extending normal Three scene objects and emitting through `gameEvents` from that code rather than routing through browser globals.

Raycast guidance:

- Use `editorRef.current?.root` or `prefabRootRef.current?.root` as the traversal root.
- Use `object.userData.prefabNodeId` to map a hit `Object3D` back to authored data.
- Add your own tags or interaction metadata through the `Data` component so raycast code can stay scene-native.

Example authored click event on geometry:

```json
{
  "geometry": {
    "type": "Geometry",
    "properties": {
      "geometryType": "cylinder",
      "args": [0.45, 0.28, 1.8, 24],
      "emitClickEvent": true,
      "clickEventName": "cannon:fire"
    }
  }
}
```

Listening from React:

```tsx
import { useClickEvent } from 'react-three-game';

useClickEvent('cannon:fire', (payload) => {
  console.log('fire', payload.sourceEntityId);
}, []);
```

Direct subscription outside React:

```ts
import { gameEvents } from 'react-three-game';

const stop = gameEvents.on('target:hit', (payload) => {
  console.log(payload.sourceEntityId, payload.targetEntityId);
});

stop();
```

## Useful exports

Values:

- `GameCanvas`
- `PrefabRoot`
- `PrefabEditor`
- `PrefabEditorMode`
- `registerComponent`
- `gameEvents`
- `useGameEvent`
- `useClickEvent`
- `useEditorContext`
- `createModelNode`
- `createImageNode`
- `findComponent`
- `hasComponent`
- `useAssetRuntime`
- `useCurrentNode`
- `useCurrentNodeObject`
- `useCurrentNodeHandle`
- `loadFiles`
- `loadModel`
- `loadSound`
- `loadTexture`
- `exportGLB`
- `computeParentWorldMatrix`
- `ground`
- `soundManager`

Types:

- `Prefab`
- `PrefabNode`
- `PrefabEditorRef`
- `PrefabRootRef`
- `GameObject`
- `ComponentData`
- `SpawnOptions`
- `CurrentNodeRuntime`
- `AssetRuntime`
- `GameEventMap`
- `ContactEventPayload`
- `ClickEventPayload`
- `Component`
- `ComponentViewProps`
- `PrefabRootProps`
- `PrefabEditorProps`
- `FieldDefinition`
- `FieldType`

## Constraints

- Preserve the JSON-first prefab model.
- Keep custom components simple and let the renderer own transform, geometry/material, and model behavior.
- Prefer editor mutations for authored state and native object or handle refs for raw runtime control.
- When documenting or generating examples, use the current API names exactly as exported.


