import { Plane, useTexture } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import React, { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

// get more textures from https://polyhaven.com/textures

const Terrain = () => {
    const props = useTexture({
        map: '/textures/floor/rocks2/aerial_rocks_04_diff_1k.jpg',
        displacementMap: '/textures/floor/rocks2/aerial_rocks_04_disp_1k.png',
        normalMap: '/textures/floor/rocks2/aerial_rocks_04_nor_gl_1k.jpg',
        roughnessMap: '/textures/floor/rocks2/aerial_rocks_04_rough_1k.jpg',
    })
    const props2 = useTexture({
        map: '/textures/floor/rocks/gray_rocks_diff_1k.jpg',
        displacementMap: '/textures/floor/rocks/gray_rocks_disp_1k.png',
        normalMap: '/textures/floor/rocks/gray_rocks_nor_gl_1k.jpg',
        roughnessMap: '/textures/floor/rocks/gray_rocks_rough_1k.jpg',
    })

    const matRef1 = useRef<THREE.MeshStandardMaterial>(null);
    const matRef2 = useRef<THREE.MeshStandardMaterial>(null);

    // Tiling and texture settings for first plane
    useEffect(() => {
        if (props.map) {
            props.map.wrapS = props.map.wrapT = THREE.RepeatWrapping;
            props.map.repeat.set(5, 7);
            props.map.anisotropy = 16;
            props.map.minFilter = THREE.LinearMipmapLinearFilter;
            props.map.magFilter = THREE.LinearFilter;
            props.map.needsUpdate = true;
        }
        if (props.normalMap) {
            props.normalMap.wrapS = props.normalMap.wrapT = THREE.RepeatWrapping;
            props.normalMap.repeat.set(5, 7);
            props.normalMap.anisotropy = 16;
            props.normalMap.needsUpdate = true;
        }
        if (props.roughnessMap) {
            props.roughnessMap.wrapS = props.roughnessMap.wrapT = THREE.RepeatWrapping;
            props.roughnessMap.repeat.set(5, 7);
            props.roughnessMap.anisotropy = 16;
            props.roughnessMap.needsUpdate = true;
        }
        if (props.displacementMap) {
            props.displacementMap.wrapS = props.displacementMap.wrapT = THREE.RepeatWrapping;
            props.displacementMap.repeat.set(5, 7);
            props.displacementMap.anisotropy = 16;
            props.displacementMap.needsUpdate = true;
        }
    }, [props]);

    // Tiling and texture settings for second plane
    useEffect(() => {
        if (props2.map) {
            props2.map.wrapS = props2.map.wrapT = THREE.RepeatWrapping;
            props2.map.repeat.set(5, 7);
            props2.map.anisotropy = 16;
            props2.map.minFilter = THREE.LinearMipmapLinearFilter;
            props2.map.magFilter = THREE.LinearFilter;
            props2.map.needsUpdate = true;
        }
        if (props2.normalMap) {
            props2.normalMap.wrapS = props2.normalMap.wrapT = THREE.RepeatWrapping;
            props2.normalMap.repeat.set(5, 7);
            props2.normalMap.anisotropy = 16;
            props2.normalMap.needsUpdate = true;
        }
        if (props2.roughnessMap) {
            props2.roughnessMap.wrapS = props2.roughnessMap.wrapT = THREE.RepeatWrapping;
            props2.roughnessMap.repeat.set(5, 7);
            props2.roughnessMap.anisotropy = 16;
            props2.roughnessMap.needsUpdate = true;
        }
        if (props2.displacementMap) {
            props2.displacementMap.wrapS = props2.displacementMap.wrapT = THREE.RepeatWrapping;
            props2.displacementMap.repeat.set(5, 7);
            props2.displacementMap.anisotropy = 16;
            props2.displacementMap.needsUpdate = true;
        }
    }, [props2]);

    return (
        <RigidBody type="fixed" colliders="cuboid" position={[0, 0, 0]}>
            <Plane
                rotation={[-Math.PI / 2, 0, 0]}
                position={[-16, 0, 0]}
                args={[32, 32, 1024, 1024]}
                receiveShadow
                castShadow
            >
                <meshStandardMaterial
                    ref={matRef1}
                    attach="material"
                    color="white"
                    displacementScale={0.1}
                    {...props}
                />
            </Plane>
            <Plane
                rotation={[-Math.PI / 2, 0, 0]}
                position={[16, 0, 0]}
                args={[32, 32, 1024, 1024]}
                receiveShadow
                castShadow
            >
                <meshStandardMaterial
                    ref={matRef2}
                    attach="material"
                    color="white"
                    displacementScale={0.1}
                    {...props2}
                />
            </Plane>
        </RigidBody>
    );
};

export default function TerrainComponent() {
    return (
        <Suspense fallback={null}>
            <Terrain />
        </Suspense>
    );
}