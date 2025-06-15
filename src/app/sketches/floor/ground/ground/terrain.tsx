import { Plane, useTexture } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import React, { Suspense } from "react";

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

        // aoMap: 'PavingStones092_1K_AmbientOcclusion.jpg',
        // map: 'PavingStones092_1K_Color.jpg',
        // displacementMap: 'PavingStones092_1K_Displacement.jpg',
        // normalMap: 'PavingStones092_1K_Normal.jpg',
        // roughnessMap: 'PavingStones092_1K_Roughness.jpg',
        // aoMap: 'PavingStones092_1K_AmbientOcclusion.jpg',
    })

    return (
        <RigidBody type="fixed" colliders="cuboid" position={[0, -3, 0]}>
            <Plane
                rotation={[-Math.PI / 2, 0, 0]}
                position={[-32, -3, 0]}
                args={[64, 64, 1024, 1024]}
                receiveShadow
                castShadow
            >
                <meshStandardMaterial
                    attach="material"
                    color="white"
                    displacementScale={3}
                    {...props}
                />
            </Plane>
            <Plane
                rotation={[-Math.PI / 2, 0, 0]}
                position={[32, -3, 0]}
                args={[64, 64, 1024, 1024]}
                receiveShadow
                castShadow
            >
                <meshStandardMaterial
                    attach="material"
                    color="white"
                    displacementScale={3}
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