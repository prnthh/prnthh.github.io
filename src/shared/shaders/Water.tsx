"use client"

import { useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { WaterMesh } from 'three/examples/jsm/objects/WaterMesh.js';
import { TextureLoader, RepeatWrapping, Vector3, PlaneGeometry, MathUtils } from 'three';

export default function Ocean({ distortionScale = 3.7, size = 1.0, alpha = 1.0 }: { distortionScale?: number, size?: number, alpha?: number }) {
    const waterNormals = useLoader(TextureLoader, '/textures/water/waternormals.jpg');

    const water = useMemo(() => {
        const waterGeometry = new PlaneGeometry(10000, 10000);

        waterNormals.wrapS = waterNormals.wrapT = RepeatWrapping;

        const waterMesh = new WaterMesh(
            waterGeometry,
            {
                waterNormals: waterNormals,
                sunDirection: new Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: distortionScale,
                size: size,
                alpha: 1.0
            }
        );

        waterMesh.rotation.x = -Math.PI / 2;

        return waterMesh;
    }, [waterNormals, size, distortionScale, alpha]);

    useFrame(() => {
        if (water) {
            // Update sun direction to match the sky
            const sun = new Vector3();
            const phi = MathUtils.degToRad(90 - 2);
            const theta = MathUtils.degToRad(180);
            sun.setFromSphericalCoords(1, phi, theta);
            water.sunDirection.value.copy(sun).normalize();
        }
    });

    return (
        <>
            <primitive object={water} />
        </>
    );
}
