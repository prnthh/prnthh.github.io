import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { positionLocal, time, float, vec3 } from "three/tsl";


export const createWavingMaterial = (originalMaterial: THREE.Material) => {
    const material = new MeshBasicNodeMaterial();

    if (originalMaterial instanceof THREE.MeshStandardMaterial || originalMaterial instanceof THREE.MeshBasicMaterial) {
        if (originalMaterial.map) material.map = originalMaterial.map;
        if (originalMaterial.color) material.color = originalMaterial.color;
    }

    const frequency = float(2.0);
    const amplitude = float(0.2);

    const displacement = positionLocal.y
        .mul(0.3)
        .add(time.mul(frequency))
        .sin()
        .mul(amplitude)
        .mul(positionLocal.y.clamp(0, 1));

    material.positionNode = positionLocal.add(vec3(displacement, 0, 0));

    return material;
};