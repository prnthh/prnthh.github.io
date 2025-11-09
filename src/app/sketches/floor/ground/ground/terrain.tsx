import DetailedMaterial from "@/shared/shaders/floor/DetailedMaterial";
import { Plane, useTexture } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import React, { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

// get more textures from https://polyhaven.com/textures

export default function TerrainComponent() {
    return (
        <Suspense fallback={null}>
            <RigidBody type="fixed" colliders="cuboid" position={[0, 0, 0]}>
                <Plane
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[-16, 0, 0]}
                    args={[32, 32, 256, 256]}
                    receiveShadow
                    castShadow
                >
                    <DetailedMaterial />
                </Plane>
                <Plane
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[16, 0, 0]}
                    args={[32, 32, 512, 512]}
                    receiveShadow
                    castShadow
                >
                    <DetailedMaterial
                        map='/textures/floor/rocks/gray_rocks_diff_1k.jpg'
                        displacementMap='/textures/floor/rocks/gray_rocks_disp_1k.png'
                        normalMap='/textures/floor/rocks/gray_rocks_nor_gl_1k.jpg'
                        roughnessMap='/textures/floor/rocks/gray_rocks_rough_1k.jpg'
                    />
                </Plane>
            </RigidBody>
        </Suspense>
    );
}