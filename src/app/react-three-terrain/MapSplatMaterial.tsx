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
    const [grassTexture, rockTexture, sandTexture] = useTexture([
        grassTextureUrl,
        rockTextureUrl,
        sandTextureUrl,
    ]);

    useEffect(() => {
        [grassTexture, rockTexture, sandTexture].forEach((tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = true;
            tex.needsUpdate = true;
        });
    }, [grassTexture, rockTexture, sandTexture]);

    useEffect(() => {
        if (!colorTexture) return;
        colorTexture.wrapS = colorTexture.wrapT = THREE.ClampToEdgeWrapping;
        colorTexture.minFilter = THREE.LinearFilter;
        colorTexture.magFilter = THREE.LinearFilter;
        colorTexture.generateMipmaps = false;
        colorTexture.needsUpdate = true;
    }, [colorTexture]);

    const splatMaterial = useMemo(() => {
        if (!colorTexture) {
            return new THREE.MeshStandardMaterial({ color: 'gray' });
        }

        const material = new THREE.MeshStandardNodeMaterial();
        const colorSample = TSL.texture(colorTexture, TSL.uv());
        const indexedValue = colorSample.r;
        const blendWidth = 1.0 / 255.0;
        const tiledUV = TSL.uv().mul(textureScale);
        const grassColor = TSL.texture(grassTexture, tiledUV);
        const rockColor = TSL.texture(rockTexture, tiledUV);
        const sandColor = TSL.texture(sandTexture, tiledUV);

        const toWeight = (target: number) => {
            const weight = TSL.float(1.0).sub(indexedValue.sub(target).abs().div(blendWidth));
            return weight.lessThan(0.0).select(TSL.float(0.0), weight);
        };

        const grassWeight = toWeight(1.0 / 255.0);
        const rockWeight = toWeight(2.0 / 255.0);
        const sandWeight = toWeight(3.0 / 255.0);
        const totalWeight = grassWeight.add(rockWeight).add(sandWeight);
        const safeWeight = totalWeight.lessThan(0.0001).select(TSL.float(1.0), totalWeight);

        const blendedSplat = grassColor.mul(grassWeight)
            .add(rockColor.mul(rockWeight))
            .add(sandColor.mul(sandWeight))
            .div(safeWeight);

        material.colorNode = totalWeight.lessThan(0.0001).select(colorSample, blendedSplat);
        material.roughness = 1;
        material.metalness = 0;

        return material;
    }, [colorTexture, grassTexture, rockTexture, sandTexture, textureScale]);

    return <primitive object={splatMaterial} attach="material" />;
}
