"use client"

import { useMemo } from 'react';
import { SkyMesh } from 'three/examples/jsm/objects/SkyMesh.js';
import { MathUtils, Vector3 } from 'three';

export function Sky() {
    const sky = useMemo(() => {
        const skyMesh = new SkyMesh();

        // Sky parameters from the Three.js WebGPU ocean example
        skyMesh.turbidity.value = 10;
        skyMesh.rayleigh.value = 2;
        skyMesh.mieCoefficient.value = 0.005;
        skyMesh.mieDirectionalG.value = 0.8;

        const sun = new Vector3();
        const parameters = {
            elevation: 2,
            azimuth: 180
        };

        const phi = MathUtils.degToRad(90 - parameters.elevation);
        const theta = MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);
        skyMesh.sunPosition.value.copy(sun);

        return skyMesh;
    }, []);

    return (
        <primitive
            object={sky}
            scale={[10000, 10000, 10000]}
        />
    );
}
