# Advanced Physics & Patterns

## Physics Type Reference

| Situation | Physics setup | Runtime path |
|----------|---------------|--------------|
| No physics behavior needed | Omit the `Physics` component | Render only |
| Never moves: walls, floors, static props | `type: "fixed"` | Static body |
| Moves via forces or gravity: balls, boxes, ragdolls | `type: "dynamic"` | Use impulses, forces, velocity, gravity; add `ccd: true` for fast bodies and raise `mass` for heavier bodies |
| Scripted animation: moving platforms, doors | `type: "kinematicPosition"` | Drive with `rigidBody.setTranslation(...)` or scene/component transform updates |
| Velocity-driven motion: conveyors, wind zones | `type: "kinematicVelocity"` | Set runtime velocity via the rigid body ref |

**Type descriptions**:
- **fixed**: Immovable, infinite mass (ground, walls, buildings)
- **dynamic**: Affected by forces and gravity (player, projectiles, props)
- **kinematicPosition**: Move via code, push dynamic bodies (elevators, doors)
- **kinematicVelocity**: Set constant velocity, push dynamic bodies (conveyors)

Performance: `fixed` fits non-moving bodies.

## General Player Controller Pattern

Two-layer model:

- **Authored entity data** in the prefab: `Transform`, `Physics`, visuals, sounds, sensors, and any controller tuning properties.
- **Runtime control logic** in a custom component `View`: input, camera coupling, ground checks, velocity changes, jump logic, and gameplay events.

Architecture:

- Put the player body in prefab data so it can be selected, tuned, and serialized.
- Attach a custom component such as `FirstPersonPlayer` or `ThirdPersonPlayer` to that same node.
- Inside the component `View`, use `useEntityRigidBodyRef()` for body control and `useEntityRuntime()` for edit/play awareness.
- Keep transient state like key presses, timers, and cached velocity in refs, not prefab properties.
- Keep authored tuning values like `maxSpeed`, `jumpSpeed`, and `groundAccel` in component properties.

Body type selection:

- Use **dynamic** when the player should behave like a real physics body and interact naturally with forces, slopes, and other moving bodies.
- Use **kinematicPosition** when the player should feel fully game-authored and you want direct positional control.
- Drive a dynamic player through the rigid body each frame.

Control loop:

1. Read input into refs.
2. Read camera or facing direction.
3. Detect grounded state with a raycast or sensor.
4. Compute desired planar motion.
5. Apply that motion through rigid body velocity or impulses.
6. Trigger direct gameplay code where needed.

Responsibility split:

- **Physics body** decides collision and movement.
- **Camera** reads from the player, but does not own the player state.
- **Controller component** translates input into body motion.
- **Scene/gameplay systems** should talk to authored nodes through store updates, object refs, or rigid body refs.

Minimal pattern:

```tsx
import { useBeforePhysicsStep } from '@react-three/rapier';

function PlayerControllerView({ properties, children }: { properties: any; children?: React.ReactNode }) {
  const { editMode } = useEntityRuntime();
  const rigidBodyRef = useEntityRigidBodyRef();
  const inputRef = useRef({ forward: false, backward: false, left: false, right: false, jump: false });

  useBeforePhysicsStep(() => {
    const rigidBody = rigidBodyRef.current;
    if (!rigidBody || editMode) return;

    // 1. read input refs
    // 2. determine facing/camera direction
    // 3. ground probe
    // 4. compute desired motion
    // 5. apply via setLinvel / impulses
  });

  return <>{children}</>;
}
```

Use `useBeforePhysicsStep` from `@react-three/rapier` when a controller needs to run in lockstep with physics stepping. Use `useFrame` for looser per-frame runtime behavior that does not need physics-step timing.

Applicable to first-person, third-person, top-down, vehicle, and AI-driven actors.

## Physics component properties

`Physics` component property reference.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `'dynamic'` \| `'fixed'` \| `'kinematicPosition'` \| `'kinematicVelocity'` | `'dynamic'` | Body type (see reference table above) |
| `mass` | `number` | `1` | Body mass (dynamic only) |
| `restitution` | `number` | `0` | Bounciness (0 = no bounce, 1 = perfect bounce) |
| `friction` | `number` | `0.5` | Surface friction (0 = ice, 1+ = sticky) |
| `linearDamping` | `number` | `0` | Velocity decay (0 = none, 1 = full stop) |
| `angularDamping` | `number` | `0` | Rotation decay |
| `gravityScale` | `number` | `1` | Gravity multiplier (0 = floating, 2 = heavy) |
| `linearVelocity` | `[number, number, number]` | `[0, 0, 0]` | Initial linear velocity applied when the rigid body mounts |
| `angularVelocity` | `[number, number, number]` | `[0, 0, 0]` | Initial angular velocity applied when the rigid body mounts |
| `lockTranslations` | `boolean` | `false` | Freeze position |
| `lockRotations` | `boolean` | `false` | Freeze rotation |
| `enabledTranslations` | `[bool, bool, bool]` | `[true, true, true]` | Lock per axis (X, Y, Z) |
| `enabledRotations` | `[bool, bool, bool]` | `[true, true, true]` | Lock rotation per axis |
| `colliders` | `'hull'` \| `'trimesh'` \| `'cuboid'` \| `'ball'` | auto | Collider shape override (`fixed` defaults to `trimesh`, others to `hull`) |
| `ccd` | `boolean` | `false` | Continuous collision detection (fast objects) |
| `sensor` | `boolean` | `false` | Trigger only, no collision response |
| `activeCollisionTypes` | `'all'` | - | Enable kinematic/fixed collision detection (default: dynamic only) |
| `collisionGroups` | `number` | - | Rapier collision groups bitfield |
| `solverGroups` | `number` | - | Rapier solver groups bitfield |
| `emitSensorEnterEvent` | `boolean` | `false` | Emit a `gameEvents` sensor-enter event when an intersection starts |
| `sensorEnterEventName` | `string` | `''` | Event bus name for sensor enter |
| `emitSensorExitEvent` | `boolean` | `false` | Emit a `gameEvents` sensor-exit event when an intersection ends |
| `sensorExitEventName` | `string` | `''` | Event bus name for sensor exit |
| `emitCollisionEnterEvent` | `boolean` | `false` | Emit a `gameEvents` collision-enter event when a collision starts |
| `collisionEnterEventName` | `string` | `''` | Event bus name for collision enter |
| `emitCollisionExitEvent` | `boolean` | `false` | Emit a `gameEvents` collision-exit event when a collision ends |
| `collisionExitEventName` | `string` | `''` | Event bus name for collision exit |

**Example - Bouncy Ball**:
```json
{
  "physics": {
    "type": "Physics",
    "properties": {
      "type": "dynamic",
      "mass": 0.5,
      "restitution": 0.9,
      "friction": 0.1,
      "linearDamping": 0.05
    }
  }
}
```

**Example - Ice Surface**:
```json
{
  "physics": {
    "type": "Physics",
    "properties": {
      "type": "fixed",
      "friction": 0,
      "restitution": 0.1
    }
  }
}
```

**Example - Authored Projectile Launch**:
```json
{
  "physics": {
    "type": "Physics",
    "properties": {
      "type": "dynamic",
      "colliders": "ball",
      "ccd": true,
      "linearVelocity": [0, 8, -24]
    }
  }
}
```

Use `linearVelocity` and `angularVelocity` for authored initial motion. Use a rigid body ref for runtime velocity changes.

## Force & Impulse Application

Rigid body access surfaces:

- `editorRef.current?.getRigidBody(id)` for authored prefab entities mounted in `PrefabEditor`.
- `prefabRootRef.current?.getRigidBody(id)` when you own a `PrefabRoot` ref directly.
- `useEntityRigidBodyRef()` inside a component `View` rendered by `PrefabRoot`.

Access order:

- Inside a component `View`: `useEntityRigidBodyRef()`
- Inside a component `View`, targeting another authored node: `useAssetRuntime().getRigidBody(targetNodeId)`
- In editor child/controller code: `editorRef.current?.getRigidBody(id)`
- In pure `PrefabRoot` embedding code: `PrefabRootRef.getRigidBody(id)`

Access guidance:

- `useEntityRigidBodyRef()` for the current node's own body
- `useAssetRuntime().getRigidBody(nodeId)` for another authored node from inside a component view
- `editorRef.current?.getRigidBody(id)` when scripting from outside component views

### PrefabEditor ref access

```tsx
import { useRef, useEffect } from 'react';
import { PrefabEditor } from 'react-three-game';
import type { PrefabEditorRef } from 'react-three-game';
import type { RapierRigidBody } from '@react-three/rapier';

function ForceApplier({ editorRef }: { editorRef: React.RefObject<PrefabEditorRef> }) {
  useEffect(() => {
    const interval = setInterval(() => {
      const rigidBody = editorRef.current?.getRigidBody('ball') as RapierRigidBody | null;
      
      if (rigidBody) {
        rigidBody.applyImpulse({ x: 0, y: 5, z: 0 }, true);
        rigidBody.addForce({ x: 0, y: 10, z: 0 }, true);
        rigidBody.applyTorqueImpulse({ x: 0, y: 1, z: 0 }, true);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [editorRef]);
  
  return null;
}

function Scene() {
  const editorRef = useRef<PrefabEditorRef>(null);
  
  return (
    <PrefabEditor ref={editorRef} initialPrefab={prefab}>
      <ForceApplier editorRef={editorRef} />
    </PrefabEditor>
  );
}
```

### PrefabRoot ref access

```tsx
import { useEffect, useRef } from 'react';
import { GameCanvas, PrefabRoot } from 'react-three-game';
import type { PrefabRootRef } from 'react-three-game';
import type { RapierRigidBody } from '@react-three/rapier';

function ForceScene({ prefab }: { prefab: any }) {
  const rootRef = useRef<PrefabRootRef>(null);

  useEffect(() => {
    const rigidBody = rootRef.current?.getRigidBody('ball') as RapierRigidBody | null;
    rigidBody?.applyImpulse({ x: 0, y: 5, z: 0 }, true);
  }, []);

  return <PrefabRoot ref={rootRef} data={prefab} />;
}
```

### Inside a custom component `View`

```tsx
import { useFrame } from '@react-three/fiber';
import { useEntityRigidBodyRef, type Component } from 'react-three-game';
import type { RapierRigidBody } from '@react-three/rapier';

function BoosterView({ children }: { children?: React.ReactNode }) {
  const rigidBodyRef = useEntityRigidBodyRef<RapierRigidBody>();

  useFrame(() => {
    rigidBodyRef.current?.addForce({ x: 0, y: 2, z: 0 }, true);
  });

  return <>{children}</>;
}
```

### Custom R3F physics

For fully custom physics objects, own the `RigidBody` ref directly.

```tsx
import { useRef } from 'react';
import { RigidBody } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { PrefabEditor } from 'react-three-game';

function PhysicsBall() {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  
  useFrame(() => {
    if (rigidBodyRef.current) {
      // Apply jump force on interval
      rigidBodyRef.current.applyImpulse({ x: 0, y: 5, z: 0 }, true);
    }
  });
  
  return (
    <RigidBody ref={rigidBodyRef} position={[0, 5, 0]} type="dynamic">
      <mesh castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </RigidBody>
  );
}

<PrefabEditor initialPrefab={prefab}>
  <PhysicsBall />
</PrefabEditor>
```

### Store-driven kinematic updates

For authored kinematic motion, use `kinematicPosition` and update through the prefab store.

```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PrefabEditor } from 'react-three-game';
import type { PrefabEditorRef } from 'react-three-game';

function KinematicMover({ editorRef }: { editorRef: React.RefObject<PrefabEditorRef> }) {
  useFrame(({ clock }) => {
    const y = 2 + Math.sin(clock.elapsedTime * 2) * 3;
    editorRef.current?.store.getState().updateNode("platform-id", (node) => ({
      ...node,
      components: {
        ...node.components,
        transform: {
          type: "Transform",
          properties: {
            ...node.components?.transform?.properties,
            position: [0, y, 0],
          },
        },
      },
    }));
  });
  
  return null;
}
```

### Authored movement guidance

Authored gameplay bodies: elevators, doors, moving platforms.

- Use `rigidBody.setTranslation(...)` when you want direct authored movement and already know the target position.
- Use `setLinvel(...)` when the gameplay behavior is naturally velocity-driven.
- Use Rapier kinematic next-step APIs when you specifically want to model motion through Rapier's kinematic stepping semantics.
- Use `editorRef.current?.store.getState().updateNode(...)` when your gameplay system is intentionally expressed as prefab-property mutation.

Guidance:

- Inside a component `View`, direct rigid body mutation is the node-local authored control path.
- Outside component views, prefab store updates are the authored control surface.

Rapier `RigidBody` methods:
- `applyImpulse(vector, wakeUp)` - Instantaneous velocity change
- `addForce(vector, wakeUp)` - Continuous force application
- `applyTorqueImpulse(vector, wakeUp)` - Rotational impulse
- `addTorque(vector, wakeUp)` - Continuous torque
- `setLinvel(vector, wakeUp)` - Set linear velocity directly
- `setAngvel(vector, wakeUp)` - Set angular velocity directly

## Tilted Surfaces & Containment

Tilted walls act like sloped surfaces, so bodies slide along them.

### Sloped Wall Example
```json
{
  "id": "tilted-wall",
  "components": {
    "transform": { "type": "Transform", "properties": { "rotation": [0, 0, 0.3] } },
    "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [10, 5, 1] } },
    "physics": { "type": "Physics", "properties": { "type": "fixed" } }
  }
}
```
This shape behaves like a ramp.

### Containment Wall Pattern
```json
{
  "id": "container",
  "children": [
    {
      "id": "floor",
      "components": {
        "transform": { "type": "Transform", "properties": { "position": [0, 0, 0] } },
        "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [20, 1, 20] } },
        "physics": { "type": "Physics", "properties": { "type": "fixed" } }
      }
    },
    {
      "id": "wall-north",
      "components": {
        "transform": { "type": "Transform", "properties": { "position": [0, 2.5, -10] } },
        "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [20, 5, 1] } },
        "physics": { "type": "Physics", "properties": { "type": "fixed" } }
      }
    },
    {
      "id": "wall-south",
      "components": {
        "transform": { "type": "Transform", "properties": { "position": [0, 2.5, 10] } },
        "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [20, 5, 1] } },
        "physics": { "type": "Physics", "properties": { "type": "fixed" } }
      }
    },
    {
      "id": "wall-east",
      "components": {
        "transform": { "type": "Transform", "properties": { "position": [10, 2.5, 0] } },
        "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [1, 5, 20] } },
        "physics": { "type": "Physics", "properties": { "type": "fixed" } }
      }
    },
    {
      "id": "wall-west",
      "components": {
        "transform": { "type": "Transform", "properties": { "position": [-10, 2.5, 0] } },
        "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [1, 5, 20] } },
        "physics": { "type": "Physics", "properties": { "type": "fixed" } }
      }
    }
  ]
}
```

Containment walls sit perpendicular to gravity.

## Instanced Physics

`"instanced": true` changes the physics path. Instanced physics batches compatible `fixed` and `dynamic` bodies through `InstancedRigidBodies`.

### Standard vs Instanced Physics

| Aspect | Standard Physics | Instanced Physics |
|--------|------------------|-------------------|
| RigidBody Component | Individual `<RigidBody>` per object | Single `<InstancedRigidBodies>` group per model + supported physics type |
| Ref Access | `editorRef.current?.getRigidBody(nodeId)` or `PrefabRootRef.getRigidBody(nodeId)` | No stable per-instance rigid body lookup |
| Force Application | Direct per-object | Must access via InstancedRigidBodies ref |
| Collider Type | `hull` (dynamic) or `trimesh` (fixed) | Auto-selected by instanced physics path |
| Performance | One draw call per object | One draw call for all instances |

### Defining instanced objects

Set `"instanced": true` in the model component. Instances with the same model path and compatible physics type are batched.

```json
{
  "id": "tree1",
  "components": {
    "transform": { "type": "Transform", "properties": { "position": [0, 0, 0] } },
    "model": { "type": "Model", "properties": { "filename": "models/tree.glb", "instanced": true } },
    "physics": { "type": "Physics", "properties": { "type": "fixed" } }
  }
}
```

Additional instances of the same compatible model are batched automatically:

```json
{
  "id": "tree2",
  "components": {
    "transform": { "type": "Transform", "properties": { "position": [5, 0, 3] } },
    "model": { "type": "Model", "properties": { "filename": "models/tree.glb", "instanced": true } },
    "physics": { "type": "Physics", "properties": { "type": "fixed" } }
  }
}
```

### Force Application on Instanced Objects

Instanced physics bodies are not individually addressable through normal node-level rigid body APIs. For force/impulse control, kinematic motion, or stable per-body refs, use non-instanced physics.

### Instanced Physics Fit

Recommended for:
- Many copies of the same static object (trees, rocks, buildings)
- Large scenes with 100+ similar objects
- Fixed physics bodies that never move
- Background props and decorations

Best handled with standard non-instanced physics:
- Objects requiring individual force/impulse control
- Dynamic objects with unique behaviors
- Objects that need to be individually removed/spawned
- Fewer than ~20 instances (overhead not worth it)

### Performance Notes

- **Batching**: All instances with the same `filename` and `physics.type` are rendered in a single draw call
- **Supported body types**: The instanced physics path is intended for `fixed` and `dynamic` bodies; use standard non-instanced physics for kinematic bodies
- **Scale handling**: Visual scale is applied per-instance, but collider scale may differ
- **Transform updates**: Use prefab store updates to move instances (triggers re-sync)
- **Memory**: One set of GPU buffers shared across all instances

## Sensors

Sensors detect intersections without physical contact response. Use them when you need trigger volumes, and handle the resulting gameplay logic in your own Rapier or React code.

When you want authored triggers without a custom controller wrapper, you can opt into `gameEvents` emission directly from the `Physics` component by setting the relevant `emit...Event` boolean and event name.

### Creating a Sensor

Set `sensor: true` in the `Physics` component:

```json
{
  "id": "trigger-zone",
  "components": {
    "transform": { "type": "Transform", "properties": { "position": [0, 1, 0] } },
    "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [4, 2, 4] } },
    "physics": { "type": "Physics", "properties": { "type": "fixed", "sensor": true } }
  }
}
```

Kinematic/fixed collision detection: sensors detect `dynamic` bodies by default. For kinematic sensors or kinematic targets, add `"activeCollisionTypes": "all"`.

```json
{
  "physics": {
    "type": "Physics",
    "properties": {
      "type": "kinematicPosition",
      "sensor": true,
      "activeCollisionTypes": "all"  // Detects walls, floors, kinematic bodies
    }
  }
}
```

### Sensor patterns

**Pickup Item:**
```json
{
  "id": "coin",
  "components": {
    "transform": { "type": "Transform", "properties": { "position": [5, 0.5, 0] } },
    "model": { "type": "Model", "properties": { "filename": "models/coin.glb" } },
    "physics": { "type": "Physics", "properties": { "type": "fixed", "sensor": true } }
  }
}
```

Handle pickup logic with your own controller code attached to the player, pickup, or surrounding React tree.

**Damage Zone:**
```json
{
  "id": "lava",
  "components": {
    "transform": { "type": "Transform", "properties": { "position": [0, 0, 0] } },
    "geometry": { "type": "Geometry", "properties": { "geometryType": "box", "args": [10, 0.5, 10] } },
    "material": { "type": "Material", "properties": { "color": "#ff4400" } },
    "physics": { "type": "Physics", "properties": { "type": "fixed", "sensor": true } }
  }
}
```

Handle damage application in your own gameplay code using direct rigid body queries, controller state, or custom Rapier callbacks.

**Level Transition:**
Handle transitions in your own gameplay or scene code when your controller determines the player reached the authored trigger.

### Interop with Custom R3F Physics

For custom `RigidBody` components that need to coordinate with authored prefab nodes, set `userData.entityId` so your own logic can identify them consistently:

```tsx
<RigidBody userData={{ entityId: 'player' }}>
  <PlayerMesh />
</RigidBody>
```

### Tips

- Sensors may overlap multiple bodies at once, so keep your own filtering logic explicit.
- Entity IDs can still live in `RigidBody.userData.entityId` when that helps your own controller code correlate bodies.
- Prefer direct React callbacks, store mutations, raw Rapier methods, and the shared `gameEvents` bus for authored trigger flow.
- Physics event payloads include both legacy-style ids and current runtime references: `sourceEntityId`, `sourceNodeId`, `sourceObject`, `sourceRigidBody`, `targetEntityId`, `targetNodeId`, `targetObject`, `targetRigidBody`, and `rapierEvent`.
