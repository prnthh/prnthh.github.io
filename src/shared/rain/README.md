# Rain Component

A performant rain effect using Three.js TSL (Three Shading Language) compute shaders.

## Features

- **GPU-Accelerated**: Uses WebGPU compute shaders for particle simulation
- **Collision Detection**: Optional collision detection with scene geometry
- **Ripple Effects**: Realistic water ripples on surfaces
- **Customizable**: Adjustable rain density, speed, area, and appearance
- **Performance**: Handles up to 50,000 particles efficiently

## Usage

```tsx
import Rain from '@/shared/effects/Rain';

function MyScene() {
  return (
    <Rain 
      particleCount={10000}
      areaSize={[60, 60]}
      position={[0, 25, 0]}
      enableCollision={true}
      opacity={0.25}
      speedMultiplier={1.5}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxParticleCount` | `number` | `50000` | Maximum particle capacity (for buffer allocation) |
| `particleCount` | `number` | `25000` | Active particle count |
| `areaSize` | `[number, number]` | `[100, 100]` | Rain area dimensions [width, depth] |
| `position` | `[number, number, number]` | `[0, 25, 0]` | Center position of rain area |
| `enableCollision` | `boolean` | `true` | Enable collision detection with scene objects |
| `opacity` | `number` | `0.2` | Rain drop opacity (0-1) |
| `dropSize` | `[number, number]` | `[0.1, 2]` | Rain drop dimensions [width, height] |
| `speedMultiplier` | `number` | `1` | Rain falling speed multiplier |

## Collision Detection

To enable collision detection with your scene objects:

1. Set `enableCollision={true}` (default)
2. Add objects to collision layer:
   ```tsx
   <mesh layers={1}>
     <boxGeometry />
     <meshStandardMaterial />
   </mesh>
   ```

The Rain component will render colliding objects to a depth texture and use it to detect when rain drops hit surfaces, creating ripple effects.

## Performance Tips

- Start with lower `particleCount` values and increase as needed
- Disable collision detection if not needed for better performance
- Use smaller `areaSize` to focus rain in specific regions
- Adjust `maxParticleCount` based on your target hardware

## Technical Details

The Rain component uses:
- **Compute Shaders**: For particle position/velocity updates
- **Instanced Rendering**: For efficient rendering of thousands of particles
- **Billboard Sprites**: Rain drops always face the camera
- **TSL (Three Shading Language)**: For GPU-accelerated shader code
- **Collision Depth Pass**: Renders scene depth for collision detection

## Requirements

- Three.js WebGPU renderer
- Browser with WebGPU support
- React Three Fiber setup

## Example with Custom Objects

```tsx
import Rain from '@/shared/effects/Rain';

function RainyScene() {
  return (
    <>
      <Rain 
        particleCount={15000}
        areaSize={[80, 80]}
        enableCollision={true}
      />
      
      {/* This box will interact with rain */}
      <mesh position={[0, 5, 0]} layers={1} castShadow>
        <boxGeometry args={[10, 2, 10]} />
        <meshStandardMaterial />
      </mesh>
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial />
      </mesh>
    </>
  );
}
```
