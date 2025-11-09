import { useTexture } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// get more textures from https://polyhaven.com/textures

const DetailedMaterial = ({
    map = '/textures/floor/rocks2/aerial_rocks_04_diff_1k.jpg',
    displacementMap = '/textures/floor/rocks2/aerial_rocks_04_disp_1k.png',
    normalMap = '/textures/floor/rocks2/aerial_rocks_04_nor_gl_1k.jpg',
    roughnessMap = '/textures/floor/rocks2/aerial_rocks_04_rough_1k.jpg',
    displacementScale = 0.25,
    wireframe = false,
}: { map?: string; displacementMap?: string; normalMap?: string; roughnessMap?: string; displacementScale?: number, wireframe?: boolean }) => {
    const textures = useTexture({
        map, displacementMap, normalMap, roughnessMap
    })

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

export default DetailedMaterial;