import { useTexture } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// get more textures from https://polyhaven.com/textures

const TexturedMaterial = ({
    map,
    displacementMap,
    normalMap,
    roughnessMap,
    displacementScale = 0.25,
    wireframe = false,
}: { map?: string; displacementMap?: string; normalMap?: string; roughnessMap?: string; displacementScale?: number, wireframe?: boolean }) => {
    const textureInputs: { [key: string]: string } = {};
    if (map != null) textureInputs.map = map;
    if (displacementMap != null) textureInputs.displacementMap = displacementMap;
    if (normalMap != null) textureInputs.normalMap = normalMap;
    if (roughnessMap != null) textureInputs.roughnessMap = roughnessMap;

    const textures = useTexture(textureInputs);

    const materialRef = useRef(new THREE.MeshStandardMaterial());

    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.wireframe = wireframe;
        }
    }, [materialRef.current, wireframe]);

    useEffect(() => {
        if (textures.map) {
            textures.map.wrapS = textures.map.wrapT = THREE.RepeatWrapping;
            textures.map.repeat.set(5, 7);
            textures.map.anisotropy = 16;
            textures.map.minFilter = THREE.LinearMipmapLinearFilter;
            textures.map.magFilter = THREE.LinearFilter;
            textures.map.needsUpdate = true;
        }
        if (textures.normalMap) {
            textures.normalMap.wrapS = textures.normalMap.wrapT = THREE.RepeatWrapping;
            textures.normalMap.repeat.set(5, 7);
            textures.normalMap.anisotropy = 16;
            textures.normalMap.needsUpdate = true;
        }
        if (textures.roughnessMap) {
            textures.roughnessMap.wrapS = textures.roughnessMap.wrapT = THREE.RepeatWrapping;
            textures.roughnessMap.repeat.set(5, 7);
            textures.roughnessMap.anisotropy = 16;
            textures.roughnessMap.needsUpdate = true;
        }
        if (textures.displacementMap) {
            textures.displacementMap.wrapS = textures.displacementMap.wrapT = THREE.RepeatWrapping;
            textures.displacementMap.repeat.set(5, 7);
            textures.displacementMap.anisotropy = 16;
            textures.displacementMap.needsUpdate = true;
        }
    }, [textures]);

    return <primitive {...textures} displacementScale={displacementScale} object={materialRef.current} />;
}

export default TexturedMaterial;