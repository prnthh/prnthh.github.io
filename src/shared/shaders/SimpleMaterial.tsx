import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export default function SimpleMaterial() {
    const waterNormals = useTexture('/textures/waternormals.jpg');

    const waterMaterial = useMemo(() => {
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
        waterNormals.repeat.set(1, 1);

        // Create a simple TSL-compatible water material instead of using the Water object
        const material = new THREE.MeshStandardMaterial({
            color: 0x001e4f,
            normalMap: waterNormals,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1,
            metalness: 0.1
        });

        return material;
    }, [waterNormals]);

    return <primitive object={waterMaterial} attach="material" />;
}