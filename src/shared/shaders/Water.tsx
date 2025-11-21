"use client"

import { useMemo } from 'react'
import * as THREE from 'three/webgpu'
import {
    color, vec2, linearDepth, viewportLinearDepth, viewportDepthTexture,
    viewportSharedTexture, mx_worley_noise_float, positionWorld, time,
    screenUV,
    float
} from 'three/tsl'

export function WaterMaterial() {
    const material = useMemo(() => {
        // water
        const timer = time.mul(0.8);
        const floorUV = positionWorld.xzy;

        const waterLayer0 = mx_worley_noise_float(floorUV.mul(4).add(timer));
        const waterLayer1 = mx_worley_noise_float(floorUV.mul(2).add(timer));

        const waterIntensity = waterLayer0.mul(waterLayer1);
        const waterColor = waterIntensity.mul(1.4).mix(color(0x0487e2), color(0x74ccf4));

        // linearDepth() returns the linear depth of the mesh
        const depth = linearDepth();
        const depthWater = viewportLinearDepth.sub(depth);
        const depthEffect = depthWater.remapClamp(0, 0.1);

        const refractionUV = screenUV.add(vec2(0, waterIntensity.mul(0.1)));

        // linearDepth( viewportDepthTexture( uv ) ) return the linear depth of the scene
        const depthTestForRefraction = linearDepth(viewportDepthTexture(refractionUV)).sub(depth);

        const depthRefraction = depthTestForRefraction.remapClamp(0, 0.5);

        const finalUV = depthTestForRefraction.lessThan(0).select(screenUV, refractionUV);

        const viewportTexture = viewportSharedTexture(finalUV);

        const waterMaterial = new THREE.MeshBasicNodeMaterial();
        waterMaterial.colorNode = waterColor;

        // Use mix instead of multiply for better visibility of water color over dark backgrounds
        const deepWaterColor = viewportTexture.mix(waterColor, depthRefraction.mul(0.8));

        waterMaterial.backdropNode = depthEffect.mix(viewportSharedTexture(), deepWaterColor);
        waterMaterial.backdropAlphaNode = float(1); // Ensure opaque alpha
        waterMaterial.transparent = true;

        return waterMaterial;
    }, []);

    return <primitive object={material} attach="material" />;
}

export default function Ocean() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[256, 1, 256]}>
            <planeGeometry args={[1024, 1024]} />
            <WaterMaterial />
        </mesh>
    );
}

