"use client"

import { Canvas } from '@react-three/fiber';

import {
    MeshBasicNodeMaterial,
    WebGPURenderer,
} from 'three/webgpu';
import { CustomTSLThing } from './CustomTSLThing';

const App = () => {
    return (
        <Canvas
            camera={{ position: [1, 1, 1] }}
            gl={async (props) => {
                const renderer = new WebGPURenderer(props as any)
                await renderer.init();
                return renderer;
            }}
        >
            <color attach="background" args={['#f0f0f0']} />
            <CustomTSLThing />
        </Canvas>
    );
};

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <App />
            </div>
        </div>
    );
}
