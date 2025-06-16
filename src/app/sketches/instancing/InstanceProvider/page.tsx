"use client";
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Perf } from 'r3f-perf';
import InstanceViewer, { InstanceData } from './InstanceViewer';

export default function App() {
    const data = [
        createInstanceData('/models/environment/tree.glb'),
        createInstanceData('/models/environment/shoe.glb'),
        createInstanceData('/models/environment/tree.glb'),
        createInstanceData('/models/environment/shoe.glb'),
    ];
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas camera={{ position: [0, 0, 20], fov: 50 }}>
                    <Perf />
                    <InstanceViewer data={data} />
                    <Environment preset="city" />
                    <OrbitControls makeDefault />
                    <ambientLight intensity={0.5 * Math.PI} />
                    <directionalLight intensity={0.3} position={[5, 25, 20]} />
                </Canvas>
            </div>
        </div>
    )
}

function createInstanceData(meshPath: string): InstanceData {
    return {
        position: [
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        ],
        rotation: [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        ],
        meshPath,
    };
}

