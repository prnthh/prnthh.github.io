"use client";

import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import { Canvas, extend, useFrame, useThree, useLoader, ThreeToJSXElements } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';

// Extend R3F for THREE JSX elements
declare module '@react-three/fiber' {
    interface ThreeElements extends ThreeToJSXElements<typeof THREE> { }
}
extend(THREE as any);

// Props for the Terrain component
interface TerrainProps {
    width?: number;
    height?: number;
    widthSegments?: number;
    heightSegments?: number;
    controlMapUrl: string;
    heightMapUrl: string;
    grassTextureUrl: string;
    rockTextureUrl: string;
    sandTextureUrl: string;
}

const Terrain: React.FC<TerrainProps> = ({
    width = 20,
    height = 20,
    widthSegments = 128,
    heightSegments = 128,
    controlMapUrl,
    heightMapUrl,
    grassTextureUrl,
    rockTextureUrl,
    sandTextureUrl,
}) => {
    const { gl, invalidate } = useThree();

    // Verify WebGPURenderer
    useEffect(() => {
        if (!(gl instanceof THREE.WebGPURenderer)) {
            console.warn('Terrain requires WebGPURenderer for TSL support');
        }
    }, [gl]);

    // Load textures
    const [controlMap, heightMap, grassTexture, rockTexture, sandTexture] = useLoader(THREE.TextureLoader, [
        controlMapUrl,
        heightMapUrl,
        grassTextureUrl,
        rockTextureUrl,
        sandTextureUrl,
    ]);

    // Configure textures
    useEffect(() => {
        [grassTexture, rockTexture, sandTexture].forEach((tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 4); // Tile textures 4x4
        });
        controlMap.minFilter = THREE.NearestFilter; // Sharp control map
        controlMap.magFilter = THREE.NearestFilter;
        heightMap.minFilter = THREE.LinearFilter; // Smooth heightmap
        heightMap.magFilter = THREE.LinearFilter;
    }, [controlMap, heightMap, grassTexture, rockTexture, sandTexture]);

    // Create TSL material
    const material = useMemo(() => {
        const material = new THREE.MeshStandardNodeMaterial();

        // Vertex shader: Displace vertices using heightmap
        const heightSample = TSL.texture(heightMap, TSL.uv());
        const height = TSL.float(heightSample.r).mul(2.0); // Scale height
        // Displace along Z axis (not Y) since the plane is rotated
        const displacedPosition = TSL.add(TSL.positionLocal, TSL.vec3(0, 0, height));
        material.positionNode = displacedPosition;

        // Fragment shader: Texture splatting
        const controlSample = TSL.texture(controlMap, TSL.uv());
        const grassWeight = TSL.float(controlSample.r); // Red = grass
        const rockWeight = TSL.float(controlSample.g); // Green = rock
        const sandWeight = TSL.float(controlSample.b); // Blue = sand

        // Sample textures with tiled UVs
        const tiledUV = TSL.mul(TSL.uv(), TSL.float(4.0));
        const grassColor = TSL.texture(grassTexture, tiledUV);
        const rockColor = TSL.texture(rockTexture, tiledUV);
        const sandColor = TSL.texture(sandTexture, tiledUV);

        // Blend textures
        const grassContribution = TSL.mul(grassColor, grassWeight);
        const rockContribution = TSL.mul(rockColor, rockWeight);
        const sandContribution = TSL.mul(sandColor, sandWeight);
        const finalColor = TSL.add(grassContribution, rockContribution, sandContribution);

        // Assign to material
        material.colorNode = finalColor;

        return material;
    }, [controlMap, heightMap, grassTexture, rockTexture, sandTexture]);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={material}>
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
                    controlMapUrl="/textures/floor/terrain/controlmap.png"
                    heightMapUrl="/textures/floor/terrain/heightmap.png"
                    grassTextureUrl="/textures/floor/terrain/grass-512.jpg"
                    rockTextureUrl="/textures/floor/terrain/rock-512.jpg"
                    sandTextureUrl="/textures/floor/terrain/sand-512.jpg"
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