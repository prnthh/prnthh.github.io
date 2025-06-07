import { InstancedMesh2 } from '@three.ez/instanced-mesh';

declare module '@react-three/fiber' {
    interface ThreeElements {
      instancedMesh2: any; // fallback for custom JSX elements
    }
  }