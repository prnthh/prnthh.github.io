"use client";

import * as THREE from 'three/webgpu';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TextureSplatMaterial } from '@/shared/shaders/TextureSplatMaterial';

// Props for the Terrain component
interface TerrainProps {
    width?: number;
    height?: number;
    widthSegments?: number;
    heightSegments?: number;
    controlMapUrl?: string;
    heightMapUrl?: string;
    grassTextureUrl?: string;
    rockTextureUrl?: string;
    sandTextureUrl?: string;
}

const Terrain: React.FC<TerrainProps> = ({
    width = 20,
    height = 20,
    widthSegments = 128,
    heightSegments = 128,
}) => {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <TextureSplatMaterial />
            <planeGeometry args={[width, height, widthSegments, heightSegments]} />
        </mesh>
    );
};

// Sample App component to use Terrain
const App = () => {
    return (
        <div className="items-center justify-items-center h-screen">

            <Canvas
                gl={async (props) => {
                    const renderer = new THREE.WebGPURenderer(props as any);
                    await renderer.init();
                    return renderer;
                }}
                camera={{ position: [0, 5, 10], fov: 60 }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <Terrain
                    width={20}
                    height={20}
                    widthSegments={128}
                    heightSegments={128}
                />
                <OrbitControls />
            </Canvas>
        </div>
    );
};

export default App;