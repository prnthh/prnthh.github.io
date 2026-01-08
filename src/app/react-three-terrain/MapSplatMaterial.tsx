import { useEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import * as TSL from 'three/tsl';
import { useTexture } from "@react-three/drei";

const grassTextureUrl = "/textures/floor/terrain/grass-512.jpg";
const rockTextureUrl = "/textures/floor/terrain/rock-512.jpg";
const sandTextureUrl = "/textures/floor/terrain/sand-512.jpg";

interface MapSplatMaterialProps {
    colorTexture?: THREE.Texture | null;
    textureScale?: number;
}

export function MapSplatMaterial({ colorTexture, textureScale = 4 }: MapSplatMaterialProps) {
    // Load splat textures
    const [grassTexture, rockTexture, sandTexture] = useTexture([
        grassTextureUrl,
        rockTextureUrl,
        sandTextureUrl,
    ]);

    // Configure splat textures for tiling
    useEffect(() => {
        [grassTexture, rockTexture, sandTexture].forEach((tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = true;
            tex.needsUpdate = true;
        });
    }, [grassTexture, rockTexture, sandTexture]);

    // Create TSL material
    const splatMaterial = useMemo(() => {
        if (!colorTexture) {
            // Fallback to basic material if no color texture
            return new THREE.MeshStandardMaterial({ color: 'gray' });
        }

        try {
            const material = new THREE.MeshStandardNodeMaterial();

            // Sample the color texture
            const colorSample = TSL.texture(colorTexture, TSL.uv());
            const r = colorSample.r;

            // Use red channel only for texture selection
            // r = 1/255 (~0.0039) -> grass
            // r = 2/255 (~0.0078) -> rock
            // r = 3/255 (~0.0117) -> sand
            // Otherwise, pass through the original color

            // Sample splat textures with tiled UVs
            const tiledUV = TSL.uv().mul(textureScale);
            const grassColor = TSL.texture(grassTexture, tiledUV);
            const rockColor = TSL.texture(rockTexture, tiledUV);
            const sandColor = TSL.texture(sandTexture, tiledUV);

            // todo use voronoi to blend textures

            // Detect specific red channel values (with small tolerance)
            const tolerance = 0.002;
            const isGrass = r.sub(1.0 / 255.0).abs().lessThan(tolerance);
            const isRock = r.sub(2.0 / 255.0).abs().lessThan(tolerance);
            const isSand = r.sub(3.0 / 255.0).abs().lessThan(tolerance);

            // Build final color with conditional logic
            // Chain the conditions: sand -> rock -> grass -> original
            const finalColor = isSand.select(sandColor,
                isRock.select(rockColor,
                    isGrass.select(grassColor, colorSample)
                )
            );

            material.colorNode = finalColor;

            return material;
        } catch (error) {
            console.error("Error creating MapSplatMaterial:", error);
            return new THREE.MeshStandardMaterial({ color: 'magenta' });
        }
    }, [colorTexture, grassTexture, rockTexture, sandTexture, textureScale]);

    return <primitive object={splatMaterial} attach="material" />;
}
