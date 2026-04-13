# Advanced Physics & Patterns

## Physics Type Decision Tree

```
Need physics?
├─ No  → Don't add Physics component
└─ Yes → Does it move?
    ├─ Never moves (walls, floor, static props)
    │   └─ type: "fixed"
    │
    ├─ Moves via forces/gravity (balls, boxes, ragdolls)
    │   └─ type: "dynamic"
    │       ├─ Fast moving? → ccd: true
    │       └─ Heavy? → mass: 10+
    │
    ├─ Scripted animation (moving platforms, doors)
    │   └─ type: "kinematicPosition"
    │       └─ Update transform via scene.find(...).getComponent("Transform").set(...)
    │
    └─ Velocity-driven (conveyor belts, wind zones)
        └─ type: "kinematicVelocity"
        └─ Set runtime velocity via RigidBody ref
```

**Type descriptions**:
- **fixed**: Immovable, infinite mass (ground, walls, buildings)
- **dynamic**: Affected by forces and gravity (player, projectiles, props)
- **kinematicPosition**: Move via code, push dynamic bodies (elevators, doors)
- **kinematicVelocity**: Set constant velocity, push dynamic bodies (conveyors)

**Performance tip**: Use `fixed` for anything that never moves - it's cheapest.

## General Player Controller Pattern

Treat a player controller as two layers:

- **Authored entity data** in the prefab: `Transform`, `Physics`, visuals, sounds, sensors, and any controller tuning properties.
- **Runtime control logic** in a custom component `View`: input, camera coupling, ground checks, velocity changes, jump logic, and gameplay events.

Preferred architecture:

- Put the player body in prefab data so it can be selected, tuned, and serialized.
- Attach a custom component such as `FirstPersonPlayer` or `ThirdPersonPlayer` to that same node.
- Inside the component `View`, use `useEntityRigidBodyRef()` for body control and `useEntityRuntime()` for edit/play awareness.
- Keep transient state like key presses, timers, and cached velocity in refs, not prefab properties.
- Keep authored tuning values like `maxSpeed`, `jumpSpeed`, `groundAccel`, and event names in component properties.

Rule of thumb for body type:

- Use **dynamic** when the player should behave like a real physics body and interact naturally with forces, slopes, and other moving bodies.
- Use **kinematicPosition** when the player should feel fully game-authored and you want direct positional control.
- Avoid mutating `Transform` directly for a dynamic player every frame; drive the rigid body instead.

Typical control loop:

1. Read input into refs.
2. Read camera or facing direction.
3. Detect grounded state with a raycast or sensor.
4. Compute desired planar motion.
5. Apply that motion through rigid body velocity or impulses.
6. Emit gameplay events like footsteps, landing, dash, or jump.

Keep responsibilities separate:

- **Physics body** decides collision and movement.
- **Camera** reads from the player, but does not own the player state.
- **Controller component** translates input into body motion.
- **Scene/gameplay systems** listen to events instead of reaching into controller internals.

Minimal shape:

```tsx
function PlayerControllerView({ properties, children }: { properties: any; children?: React.ReactNode }) {
  const { editMode } = useEntityRuntime();
  const rigidBodyRef = useEntityRigidBodyRef();
  const inputRef = useRef({ forward: false, backward: false, left: false, right: false, jump: false });

  useBeforePhysicsStep((world) => {
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

This pattern scales to first-person, third-person, top-down, vehicle, and AI-driven actors without changing the underlying prefab/runtime split.

## Physics Material Properties

Complete reference for `Physics` component properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `'dynamic'` \| `'fixed'` \| `'kinematicPosition'` \| `'kinematicVelocity'` | `'dynamic'` | Body type (see decision tree above) |
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

Use `linearVelocity` and `angularVelocity` for initial motion that belongs in prefab data. Use a RigidBody ref when velocity needs to change continuously at runtime.

## Force & Impulse Application

Use the current runtime APIs to access rigid bodies:

- `editorRef.current?.scene.find(id)?.rigidBody` for authored prefab entities.
- `prefabRootRef.current?.getRigidBody(id)` when you own a `PrefabRoot` ref directly.
- `useEntityRigidBodyRef()` inside a component `View` rendered by `PrefabRoot`.

Preferred order:

- Inside a component `View`: `useEntityRigidBodyRef()`
- In editor child/controller code: `scene.find(id)?.rigidBody`
- In pure `PrefabRoot` embedding code: `PrefabRootRef.getRigidBody(id)`

### Scene API access

```tsx
import { useRef, useEffect } from 'react';
import { PrefabEditor } from 'react-three-game';
import type { PrefabEditorRef } from 'react-three-game';
import type { RapierRigidBody } from '@react-three/rapier';

function ForceApplier({ editorRef }: { editorRef: React.RefObject<PrefabEditorRef> }) {
  useEffect(() => {
    const interval = setInterval(() => {
      const rigidBody = editorRef.current?.scene.find('ball')?.rigidBody as RapierRigidBody | null;
      
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

**Alternative: Custom R3F components**

For fully custom physics objects, create R3F components with their own RigidBody refs:

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

**Alternative: Kinematic position updates**

For smooth animated movement without forces, use `kinematicPosition` and update via the Scene API:

```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PrefabEditor } from 'react-three-game';
import type { PrefabEditorRef } from 'react-three-game';

function KinematicMover({ editorRef }: { editorRef: React.RefObject<PrefabEditorRef> }) {
  useFrame(({ clock }) => {
    const y = 2 + Math.sin(clock.elapsedTime * 2) * 3;
    editorRef.current?.scene.find("platform-id")
      ?.getComponent("Transform")
      ?.set("position", [0, y, 0]);
  });
  
  return null;
}
```

**Rapier RigidBody methods**:
- `applyImpulse(vector, wakeUp)` - Instantaneous velocity change
- `addForce(vector, wakeUp)` - Continuous force application
- `applyTorqueImpulse(vector, wakeUp)` - Rotational impulse
- `addTorque(vector, wakeUp)` - Continuous torque
- `setLinvel(vector, wakeUp)` - Set linear velocity directly
- `setAngvel(vector, wakeUp)` - Set angular velocity directly

## Tilted Surfaces & Containment

**⚠️ Tilted walls don't contain objects** - physics objects slide off angled surfaces.

### ❌ Wrong Approach
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
Objects will **slide off** the tilted surface.

### ✅ Correct Pattern - Perpendicular Walls
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

**Key principle**: Walls must be **perpendicular to gravity** to contain dynamic objects.

## Instanced Physics

When using `"instanced": true` on models, physics behaves differently than standard objects. Physics instancing is designed for batched `fixed` and `dynamic` bodies, where instances of the same model share an `InstancedRigidBodies` path for better performance.

### Standard vs Instanced Physics

| Aspect | Standard Physics | Instanced Physics |
|--------|------------------|-------------------|
| RigidBody Component | Individual `<RigidBody>` per object | Single `<InstancedRigidBodies>` group per model + supported physics type |
| Ref Access | `scene.find(nodeId)?.rigidBody` or `PrefabRootRef.getRigidBody(nodeId)` | No stable per-instance rigid body lookup |
| Force Application | Direct per-object | Must access via InstancedRigidBodies ref |
| Collider Type | `hull` (dynamic) or `trimesh` (fixed) | Auto-selected by instanced physics path |
| Performance | One draw call per object | One draw call for all instances |

### Defining Instanced Objects

Set `"instanced": true` in the model component. **Instances with the same model path and supported physics type are automatically batched**:

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

Add multiple instances - they'll be automatically batched:

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

**Instanced physics bodies are not individually addressable through the normal node-level rigid body APIs.** For objects requiring force/impulse control, kinematic motion, or stable per-body refs, use non-instanced physics (`"instanced": false` or omit the property).

### When to Use Instanced Physics

✅ **Good for:**
- Many copies of the same static object (trees, rocks, buildings)
- Large scenes with 100+ similar objects
- Fixed physics bodies that never move
- Background props and decorations

❌ **Avoid for:**
- Objects requiring individual force/impulse control
- Dynamic objects with unique behaviors
- Objects that need to be individually removed/spawned
- Fewer than ~20 instances (overhead not worth it)

### Performance Notes

- **Batching**: All instances with the same `filename` and `physics.type` are rendered in a single draw call
- **Supported body types**: The instanced physics path is intended for `fixed` and `dynamic` bodies; use standard non-instanced physics for kinematic bodies
- **Scale handling**: Visual scale is applied per-instance, but collider scale may differ
- **Transform updates**: Use scene API to move instances (triggers re-sync)
- **Memory**: One set of GPU buffers shared across all instances

## Sensors & Collision Events

Sensors are colliders that detect intersections without generating physical contact forces. Use them for trigger zones, pickup areas, damage zones, and gameplay triggers.

### Creating a Sensor

Set `sensor: true` in the Physics component:

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

**Kinematic/Fixed Collision Detection**: By default, sensors only detect `dynamic` bodies. For kinematic sensors (like bullets) or to detect kinematic players, add `"activeCollisionTypes": "all"`:

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

### Physics Event Payload

All physics events include:

```typescript
{
  sourceEntityId: string;           // The prefab entity that owns the collider
  targetEntityId: string | null;    // The other entity (if it's a prefab entity)
  targetRigidBody: RapierRigidBody; // Direct access to the other RigidBody
}
```

`targetEntityId` is `null` when colliding with non-prefab physics bodies (custom R3F components). Use `targetRigidBody` to inspect those.

### Common Sensor Patterns

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

```tsx
useGameEvent('sensor:enter', (payload) => {
  if (payload.sourceEntityId === 'coin' && payload.targetEntityId === 'player') {
    removeCoin();
    gameEvents.emit('score:change', { delta: 100, total: score + 100 });
  }
}, [score]);
```

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

```tsx
useGameEvent('sensor:enter', ({ sourceEntityId, targetEntityId }) => {
  if (sourceEntityId === 'lava') {
    gameEvents.emit('player:damage', { entityId: targetEntityId, amount: 50 });
  }
}, []);
```

**Level Transition:**
```tsx
useGameEvent('sensor:enter', ({ sourceEntityId, targetEntityId }) => {
  if (sourceEntityId === 'exit-door' && targetEntityId === 'player') {
    loadNextLevel();
  }
}, []);
```

### Interop with Custom R3F Physics

For custom RigidBody components to participate in the event system, set `userData.entityId`:

```tsx
<RigidBody userData={{ entityId: 'player' }}>
  <PlayerMesh />
</RigidBody>
```

Now when prefab sensors detect this body, `targetEntityId` will be `'player'`.

### Tips

- Sensors fire events for **all** intersecting bodies - filter by ID
- `sensor:exit` fires when something leaves a sensor zone
- `collision:enter/exit` fires for non-sensor physics bodies
- Entity IDs stored in `RigidBody.userData.entityId`
- Let the component that causes the action choose the event name.
- Let other components listen to that event name instead of inventing their own meaning for it.
