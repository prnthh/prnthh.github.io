# Runtime Integrations (Physics, Controllers, AI, etc.)

`react-three-game` is a renderer plus an editor. Runtime systems — physics, navmesh, gameplay state, debug overlays — live **in userland**, mounted as children of `<PrefabEditor>` / `<PrefabRoot>`, and integrated through:

1. The `Scene` API (`useScene()` / `editorRef`) for reading and mutating authored state.
2. Custom components whose `View` owns a per-node lifecycle.
3. A small singleton or React context that exposes runtime state (e.g. a physics world) to those component views.

This file documents the patterns that work well. The physics demo uses [crashcat](https://www.npmjs.com/package/crashcat); substitute any system that has a "world" plus per-body lifecycle.

## Architecture: per-component-View ownership

The shape that scales:

- **Authored config lives in a first-class component**, e.g. `CrashcatPhysics`, with its own `Editor` and `View`.
- **The View owns the body's lifecycle**: it creates the body in `useEffect` on mount, cleans up on unmount.
- **A separate runtime component** owns the world, the per-frame step, and a small registry of bodies.
- The two halves talk through a tiny API surface (a context value or a singleton hook), one direct call per body.

Why it works: mounting/unmounting a node automatically creates/destroys its body. Editor toggles between Edit and Play just remount Views (because View effects gate on `editMode`). Per-frame work stays at "step the world, sync transforms" — no diffing, no scene walks.

## Authored config — first-class component

```json
{
  "id": "wall",
  "components": {
    "transform": { "type": "Transform", "properties": { "position": [0, 1, 0] } },
    "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [4, 2, 0.4] } },
    "crashcatPhysics": {
      "type": "CrashcatPhysics",
      "properties": {
        "shape": "autoBox",
        "motionType": "static"
      }
    }
  }
}
```

Guidance:

- Put physics config on the **same node** as the rendered geometry. The View can read its own bounds via `getObject()` and build the collider shape directly.
- Keep runtime config in a first-class component. `Data` is best reserved for small bits of authored metadata that other systems just *read*; anything with its own behavior earns its own component.

## Runtime provider — owns world, exposes API

A typical runtime provider:

- Creates the world in a one-shot `useEffect`.
- Exposes a small API (`world`, `register(nodeId, body, meta)`, `unregister(nodeId)`, `getBody(nodeId)`).
- Steps the world in `useFrame`, gated on `scene.mode === Play`.
- Writes dynamic body transforms back to the mounted `Object3D`s.
- Reads kinematic objects' transforms from the scene (so anything moved by gameplay code or animations drives kinematic bodies).

The API is exposed either through React context (when the runtime is the parent of all consumers) or a module-level singleton + `useSyncExternalStore` (when the runtime and consumers are siblings — the common case, since component `View`s mount **inside** `<PrefabEditor>` while the runtime is a sibling child).

```tsx
// Module-level singleton; works regardless of React tree placement.
const LISTENERS = new Set<() => void>();
let API: CrashcatApi | null = null;

function setApi(next: CrashcatApi | null) {
  API = next;
  LISTENERS.forEach((l) => l());
}

export function useCrashcat(): CrashcatApi | null {
  return useSyncExternalStore(
    (l) => { LISTENERS.add(l); return () => LISTENERS.delete(l); },
    () => API,
    () => API,
  );
}

export function CrashcatRuntime({ children }: { children?: React.ReactNode }) {
  const scene = useScene();
  const bodies = useRef(new Map<string, BodyEntry>());

  useEffect(() => {
    const world = createWorld(/* ... */);
    setApi({
      world,
      register: (nodeId, body, meta) => bodies.current.set(nodeId, { body, meta }),
      unregister: (nodeId) => { /* remove + dispose */ },
      getBody: (nodeId) => bodies.current.get(nodeId)?.body ?? null,
    });
    return () => { setApi(null); bodies.current.clear(); /* dispose world */ };
  }, []);

  useFrame((_, dt) => {
    if (!API) return;
    if (scene.mode !== PrefabEditorMode.Edit) {
      // Drive kinematic bodies from scene transforms, then step.
      for (const [id, { body, meta }] of bodies.current) {
        if (meta.motionType !== Kinematic) continue;
        const obj = scene.getObject(id);
        if (obj) moveKinematic(body, obj);
      }
      stepWorld(API.world, dt);
    }
    // Write dynamic transforms back.
    for (const [id, { body, meta }] of bodies.current) {
      if (meta.motionType !== Dynamic) continue;
      scene.getObject(id) && writeWorldTransform(scene.getObject(id)!, body);
    }
  });

  return <>{children}</>;
}
```

Use a singleton + `useSyncExternalStore` when the runtime and its consumers can end up in different React subtrees — the common case, since component `View`s mount inside `<PrefabEditor>` while the runtime is a sibling child. Reach for `createContext` + `<Context.Provider>` when everything is guaranteed to live below the runtime.

## Per-component View — owns body lifecycle

```tsx
function CrashcatPhysicsView({ properties, children }: ComponentViewProps<Props>) {
  const { nodeId, getObject, editMode } = useNode();
  const crashcat = useCrashcat();

  useEffect(() => {
    if (editMode || !crashcat) return;
    const object = getObject();
    if (!object) return;

    const shape = createShape(object, properties);
    const body = rigidBody.create(crashcat.world, { shape, /* ... */ });
    crashcat.register(nodeId, body, deriveMeta(properties));

    return () => crashcat.unregister(nodeId);
  }, [crashcat, editMode, getObject, nodeId, properties]);

  return <>{children}</>;
}
```

Key guidance:

- Skip the effect when `editMode` is true — nothing to register, nothing to step.
- Read settings from `properties`.
- Compute bounds in **object-local** space (use `inverseWorldMatrix` to fold child geometries into the node's local frame), then place the body at the world center + world rotation. This keeps rotation single-baked.
- Render `<>{children}</>` so your `View` participates in composition and child nodes mount through it.

## Controller — sibling R3F component, scene-native

A character controller is the same shape: a sibling component to the runtime, reading from `useScene()` and `useCrashcat()`, writing into the player node's `Object3D`.

```tsx
export default function FirstPersonPlayer({ nodeId }: { nodeId: string }) {
  const scene = useScene();
  const crashcat = useCrashcat();
  const { camera } = useThree();
  const playMode = scene.mode === PrefabEditorMode.Play;
  const characterRef = useRef<KCC | null>(null);

  // Input lives in refs.
  // Build/teardown the character in useEffect when crashcat or playMode changes.
  // useFrame: gated on playMode + crashcat present, then drive kcc and write
  // the character's world position back to scene.getObject(nodeId).position.

  return playMode ? <PointerLockControls makeDefault /> : null;
}
```

```tsx
<PrefabEditor initialPrefab={prefab}>
  <CrashcatRuntime debug>
    <FirstPersonPlayer nodeId="player" />
  </CrashcatRuntime>
</PrefabEditor>
```

Guidance:

- Player tunables that you want serialized (radius, jump speed, footstep event name) — pass as props, or hoist them into a `FirstPersonPlayer` custom component for inspector editing.
- Footsteps and other broadcast events use `gameEvents.emit(name, { speed })`. Omit `nodeId` / `sourceNodeId` so every `Sound` listener accepts the event; include them when you want to address one specific listener.
- Keep gravity + integration in the controller for the player; let the runtime handle dynamic bodies for everything else.

## Edit-mode authoring assist

When the runtime needs derived data in edit mode (collision preview, baked navmesh), drive rebuilds from authored changes instead of every frame. Subscribe through the prefab store or rely on component `View` lifecycle:

```tsx
import { usePrefabStoreApi } from 'react-three-game';

const store = usePrefabStoreApi();
useEffect(() => store.subscribe((s) => s.nodesById, () => markDirty()), [store]);
```

Then in `useFrame` rebuild only when `dirtyRef.current` is set.

## Checklist

- Authored runtime config lives in a first-class component (`CrashcatPhysics`, `Navmesh`, etc.).
- The runtime exposes a tiny API (`world` + `register` / `unregister`).
- Each authored body's `View` owns its lifecycle via `useEffect` keyed on `[crashcat, editMode, properties]`.
- Per-frame work stays at stepping + transform sync.
- Controllers read scene state through `useScene()` / `useNode()` and write back via `getObject()`.
- Cross-system communication uses `gameEvents` for broadcasts and `Scene.getHandle(id, kind)` for direct addressing.
- Setup work lives inside a component's `useEffect`, so mounting and unmounting handle it cleanly.
