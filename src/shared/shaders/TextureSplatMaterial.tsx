import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import * as TSL from 'three/tsl';

const controlMapUrl = "/textures/floor/terrain/controlmap.png"
const heightMapUrl = "/textures/floor/terrain/heightmap.png"
const grassTextureUrl = "/textures/floor/terrain/grass-512.jpg"
const rockTextureUrl = "/textures/floor/terrain/rock-512.jpg"
const sandTextureUrl = "/textures/floor/terrain/sand-512.jpg"

export function TextureSplatMaterial() {
    const { gl, invalidate } = useThree();

    // Verify WebGPURenderer
    useEffect(() => {
        if (!(gl instanceof THREE.WebGPURenderer)) {
            console.warn('Terrain requires WebGPURenderer for TSL support');
        }
    }, [gl]);

    // Load textures
    const [controlMap, heightMap, grassTexture, rockTexture, sandTexture] = useTexture([
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
    const splatMaterial = useMemo(() => {
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

    return <primitive object={splatMaterial} attach="material" />;
}