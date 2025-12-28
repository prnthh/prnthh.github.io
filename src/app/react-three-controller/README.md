# react-three-controller

A comprehensive game development library for React Three Fiber applications, featuring Unity-style interaction priorities, first/third-person controllers, character systems, and navigation.

## Features

- **Unity-Style Input System** - Priority-based interaction blocking prevents input conflicts
- **First & Third Person Controllers** - Ready-to-use character controllers with physics
- **Interaction Manager** - Handle conflicts between UI, weapons, interactive objects, and gameplay
- **Character System (Ped)** - Advanced humanoid characters with animations, ragdoll physics, and IK
- **Navigation System** - NavMesh integration for AI pathfinding
- **Multi-Platform Input** - Mouse, keyboard, touch, and swipe support
- **Modular Design** - Use complete controllers or just the control logic with your own visuals

## Installation

```bash
npm install react-three-controller
# or
yarn add react-three-controller
# or
pnpm add react-three-controller
```

### Peer Dependencies

```bash
npm install @react-three/fiber @react-three/drei @react-three/rapier three zustand
```

## Quick Start

### Basic First Person Setup

```tsx
import { ControlsProvider, FirstPersonController } from 'react-three-controller';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';

function App() {
  return (
    <ControlsProvider>
      <Canvas>
        <Physics>
          <FirstPersonController />
          {/* Your 3D scene */}
        </Physics>
      </Canvas>
    </ControlsProvider>
  );
}
```

That's it! You now have a working first-person controller with movement, jumping, sprinting, and mouse look.

## Core Concepts

### 1. Controls vs Controller Pattern

The library provides two variants for each control scheme:

| Component | Purpose | Use When |
|-----------|---------|----------|
| **`*Controller`** | Complete solution with physics, visuals, and logic | Quick prototyping or you want the default setup |
| **`*Controls`** | Logic only (movement, camera, input) | You have custom character models/visuals |

**Example:**

```tsx
// Controller - Everything included
<FirstPersonController />

// Controls - Bring your own RigidBody and visuals
<RigidBody ref={rigidBodyRef} colliders={false}>
  <CapsuleCollider args={[0.5, 0.2]} />
  <MyCustomCharacterMesh />
  <FirstPersonControls rigidBodyRef={rigidBodyRef} />
</RigidBody>
```

### 2. Priority-Based Interaction System

Prevent input conflicts with a priority system. Higher priorities block lower ones.

**Priority Levels:**
- `UI = 100` - Blocks everything
- `INTERACTIVE_OBJECTS = 50` - Blocks weapons and world interactions
- `WORLD_INTERACTIONS = 25` - Blocks weapons
- `WEAPONS = 10` - Default weapon priority
- `DEFAULT = 0` - Lowest priority

**Example: Interactive Button**

```tsx
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { InteractionManager, InteractionPriority } from 'react-three-controller';

function InteractiveButton({ onPress }) {
  const claimId = useRef(`button-${Math.random()}`);
  const [isHovered, setIsHovered] = useState(false);

  useFrame(() => {
    // Your raycast logic to detect if player is looking at button
    const hovering = checkIfLookingAtButton();

    if (hovering) {
      // Block weapon fire while hovering over button
      InteractionManager.claim(
        claimId.current,
        InteractionPriority.INTERACTIVE_OBJECTS,
        ['fire']
      );
      setIsHovered(true);
    } else {
      InteractionManager.release(claimId.current);
      setIsHovered(false);
    }
  });

  // Cleanup on unmount
  useEffect(() => () => InteractionManager.release(claimId.current), []);

  return (
    <mesh onClick={onPress}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={isHovered ? "green" : "gray"} />
    </mesh>
  );
}
```

## API Reference

### Input System

#### `useInputStore`

Zustand store for global input state.

```tsx
import { useInputStore } from 'react-three-controller';

function MyComponent() {
  const fire = useInputStore(state => state.fire);
  const jump = useInputStore(state => state.jump);
  const setButton = useInputStore(state => state.setButton);

  // Set button with priority checking
  setButton('fire', true, InteractionPriority.WEAPONS);
}
```

**Input State:**
- `horizontal`, `vertical` - Movement axes (-1 to 1)
- `lookHorizontal`, `lookVertical` - Look axes (-1 to 1)
- `jump`, `sprint`, `use`, `altUse`, `aim`, `fire` - Boolean button states

**Actions:**
- `setAxis(axis: string, value: number)` - Set axis value
- `setButton(button: string, pressed: boolean, priority?: number)` - Set button with priority check
- `canSetButton(button: string, priority?: number)` - Check if button can be set

#### `InteractionManager`

Singleton for managing interaction priorities.

```tsx
import { InteractionManager, InteractionPriority } from 'react-three-controller';

// Claim priority to block inputs
InteractionManager.claim(
  'unique-id',
  InteractionPriority.INTERACTIVE_OBJECTS,
  ['fire', 'use'] // Inputs to block
);

// Release claim
InteractionManager.release('unique-id');

// Check if input is blocked
const blocked = InteractionManager.isInputBlocked('fire', InteractionPriority.WEAPONS);
```

### Controllers

#### `<FirstPersonController />`

Complete first-person controller with capsule physics and weapon system.

```tsx
<FirstPersonController
  position={[0, 2, 0]}
  height={1}              // Capsule height
  radius={0.3}            // Capsule radius
  walkSpeed={3.5}
  sprintSpeed={6.5}
  jumpForce={5}
  mouseSensitivity={0.002}
>
  {/* Optional: Override default capsule mesh */}
  <MyCustomMesh />
</FirstPersonController>
```

#### `<FirstPersonControls />`

First-person movement and camera logic only. Requires parent RigidBody.

```tsx
<RigidBody ref={rigidBodyRef} colliders={false}>
  <CapsuleCollider args={[height/2, radius]} />
  <YourMesh />
  <FirstPersonControls
    rigidBodyRef={rigidBodyRef}
    height={1}
    eyeHeight={0.8}
    walkSpeed={3.5}
    sprintSpeed={6.5}
    jumpForce={5}
  />
</RigidBody>
```

#### `<ThirdPersonController />`

Complete third-person controller with animated character model.

```tsx
<ThirdPersonController
  position={[0, 2, 0]}
  name="player"
/>
```

#### `<ThirdPersonControls />`

Third-person movement and camera logic. Requires RigidHumanoidModel.

```tsx
<RigidHumanoidModel ref={modelRef} basePath="/models/" model="character.glb">
  <ThirdPersonControls
    modelRef={modelRef}
    height={1.2}
    capsuleRadius={0.25}
  />
</RigidHumanoidModel>
```

#### `<CombinedController />`

Multi-mode controller for testing different control schemes.

```tsx
<CombinedController mode="third-person" />
<CombinedController mode="wawa" />     {/* Mobile swipe */}
<CombinedController mode="tap" />      {/* Tap-to-move */}
<CombinedController mode="click" target={[x, y, z]} /> {/* Click-to-move */}
```

### Input Components

These components listen for input and update the InputStore. Include them in your app to enable input methods.

#### `<KeyboardControls />`

Listens for WASD/arrow keys and space for jump.

```tsx
import { KeyboardControls } from 'react-three-controller';

<KeyboardControls />
```

#### `<PointerLockControls />`

Handles mouse look and click events. Automatically requests pointer lock.

```tsx
import { PointerLockControls } from 'react-three-controller';

<PointerLockControls sensitivity={0.002} />
```

#### `<TouchscreenControls />`

On-screen joystick and buttons for mobile.

```tsx
import { TouchscreenControls } from 'react-three-controller';

<TouchscreenControls />
```

#### `<SwipeControls />`

Touch swipe gesture detection for mobile camera control.

```tsx
import { SwipeControls } from 'react-three-controller';

<SwipeControls />
```

### Character System (Ped)

Advanced humanoid character system with animations, ragdoll physics, and attachments.

#### `<Ped />`

Main character component with animation state machine.

```tsx
import { Ped, ModelAttachment } from 'react-three-controller';

<Ped
  position={[0, 0, 0]}
  rotation={[0, Math.PI, 0]}
  model="/models/character.glb"
  basePath="/models/"
  onBulletHit={(hitData) => console.log('Character hit!', hitData)}
>
  {/* Attach items to character bones */}
  <ModelAttachment
    model="/models/weapon.glb"
    attachpoint="RightHand"
    offset={[0, 0, 0]}
    rotation={[0, 0, 0]}
  />
</Ped>
```

#### `<HumanoidModel />`

Visual humanoid model with bone structure (no physics).

```tsx
import { HumanoidModel } from 'react-three-controller';

<HumanoidModel
  basePath="/models/"
  model="character.glb"
  animations={animationsData}
/>
```

#### `<RigidHumanoidModel />`

Humanoid model with physics body and collider.

```tsx
import { RigidHumanoidModel } from 'react-three-controller';

<RigidHumanoidModel
  ref={modelRef}
  basePath="/models/"
  model="character.glb"
  position={[0, 2, 0]}
  height={1.2}
  capsuleRadius={0.25}
/>
```

#### `<Ragdoll />`

Ragdoll physics system for characters.

```tsx
import { Ragdoll } from 'react-three-controller';

<Ragdoll
  nodes={gltf.nodes}
  enabled={isRagdoll}
  initialVelocity={[0, 5, 0]}
/>
```

### Navigation System

NavMesh-based pathfinding for AI agents.

#### `<NavigableAgent />`

Agent that navigates using NavMesh pathfinding.

```tsx
import { NavigableAgent, NavigableContext } from 'react-three-controller';

<NavigableContext>
  <NavigableAgent
    position={[0, 0, 0]}
    target={[10, 0, 10]}
    speed={2}
    onReachTarget={() => console.log('Reached destination')}
  />
</NavigableContext>
```

### Weapon System

#### `<Weapon />`

First-person weapon with firing mechanics.

```tsx
import { Weapon } from 'react-three-controller';

<Weapon
  position={[0.3, -0.2, -0.4]}
  model="/models/gun.glb"
  fireRate={0.1}
  onFire={(direction) => console.log('Fired!', direction)}
/>
```

### Provider

#### `<ControlsProvider />`

Context provider that must wrap your app. Handles mobile detection and fullscreen requests.

```tsx
import { ControlsProvider } from 'react-three-controller';

function App() {
  return (
    <ControlsProvider>
      {/* Your app */}
    </ControlsProvider>
  );
}
```

## Complete Example

```tsx
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import {
  ControlsProvider,
  FirstPersonController,
  KeyboardControls,
  PointerLockControls,
  TouchscreenControls,
  Ped,
  ModelAttachment,
  InteractionManager,
  InteractionPriority,
} from 'react-three-controller';

function InteractiveNPC() {
  const claimId = useRef('npc-dialog');
  const [showDialog, setShowDialog] = useState(false);

  useFrame(() => {
    const playerNearby = checkPlayerDistance() < 2;

    if (playerNearby) {
      InteractionManager.claim(
        claimId.current,
        InteractionPriority.WORLD_INTERACTIONS,
        ['fire']
      );
      setShowDialog(true);
    } else {
      InteractionManager.release(claimId.current);
      setShowDialog(false);
    }
  });

  return (
    <Ped position={[5, 0, 5]} model="/models/npc.glb">
      <ModelAttachment
        model="/models/hat.glb"
        attachpoint="Head"
      />
      {showDialog && <DialogBubble text="Press E to talk" />}
    </Ped>
  );
}

function Scene() {
  return (
    <>
      <FirstPersonController position={[0, 2, 0]} />
      <InteractiveNPC />

      {/* Ground */}
      <RigidBody type="fixed">
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="green" />
        </mesh>
      </RigidBody>
    </>
  );
}

export default function App() {
  return (
    <ControlsProvider>
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />

        <Physics>
          <Scene />
        </Physics>

        {/* Input handlers */}
        <KeyboardControls />
        <PointerLockControls />
        <TouchscreenControls />
      </Canvas>
    </ControlsProvider>
  );
}
```

## Design Patterns

### Input Flow

```
User Input (Mouse/Keyboard/Touch)
  ↓
Input Components (KeyboardControls, PointerLockControls, etc.)
  ↓
useInputStore.setButton(button, pressed, priority)
  ↓
InteractionManager.isInputBlocked(button, priority)?
  ↓
  YES → Input blocked by higher priority
  NO  → Input state updated
  ↓
Game systems read input state (controllers, weapons, etc.)
```

### Priority System Flow

```tsx
// UI modal claims highest priority - blocks ALL inputs
InteractionManager.claim('modal', InteractionPriority.UI, ['all']);

// Interactive button claims priority 50 - blocks weapons (priority 10)
InteractionManager.claim('button', InteractionPriority.INTERACTIVE_OBJECTS, ['fire']);

// Weapon tries to fire with priority 10
setButton('fire', true, InteractionPriority.WEAPONS);
// BLOCKED - button has higher priority (50 > 10)
```

### Controls vs Controller Pattern

```
┌─────────────────────────────────────┐
│ YOU PROVIDE                         │
│ RigidBody + Model + Collider        │
└──────────────┬──────────────────────┘
               │
               ↓ Use *Controls
┌──────────────────────────────────────┐
│ Movement logic                       │
│ Camera logic                         │
│ Input handling                       │
└──────────────────────────────────────┘

OR

┌──────────────────────────────────────┐
│ LIBRARY PROVIDES                     │
│ *Controller (Full solution)          │
│ - RigidBody                          │
│ - Model                              │
│ - Collider                           │
│ - Controls                           │
└──────────────────────────────────────┘
```

## TypeScript Support

Full TypeScript support with type definitions included.

```tsx
import type { RigidBodyRef, RigidHumanoidModelRef } from 'react-three-controller';
```

## Contributing

Contributions welcome! Please ensure:
- Code follows existing patterns
- TypeScript types are included
- Examples demonstrate new features

## License

MIT

## Credits

Built with:
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber)
- [Three.js](https://threejs.org/)
- [Rapier Physics](https://rapier.rs/)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Three Drei](https://github.com/pmndrs/drei)
