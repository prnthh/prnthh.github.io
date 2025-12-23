"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMusic } from "./MusicProvider";

export default function AudioVisualizer() {
    const { audioData } = useMusic();
    const instancedRef = useRef<THREE.InstancedMesh>(null);
    const tunnelOffset = useRef(0);
    const colorTime = useRef(0);

    const numRings = 30;
    const itemsPerRing = 12;
    const totalInstances = numRings * itemsPerRing;

    // Create matrices for instances
    const { matrices, colors } = useMemo(() => {
        const matrices = new Float32Array(totalInstances * 16);
        const colors = new Float32Array(totalInstances * 3);
        const matrix = new THREE.Matrix4();

        for (let ring = 0; ring < numRings; ring++) {
            const z = -ring * 5;
            const radius = 5;

            for (let item = 0; item < itemsPerRing; item++) {
                const angle = (item / itemsPerRing) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                matrix.setPosition(x, y, z);
                matrix.toArray(matrices, (ring * itemsPerRing + item) * 16);

                // Initial color
                colors[(ring * itemsPerRing + item) * 3] = 1;
                colors[(ring * itemsPerRing + item) * 3 + 1] = 1;
                colors[(ring * itemsPerRing + item) * 3 + 2] = 1;
            }
        }

        return { matrices, colors };
    }, []);

    useFrame((state, delta) => {
        if (!instancedRef.current) return;

        const bass = audioData.bass / 255;
        const mid = audioData.mid / 255;
        const high = audioData.high / 255;
        const energy = audioData.energy / 255;

        colorTime.current += delta * 0.5;
        tunnelOffset.current += (10 + energy * 20) * delta;

        const tunnelLength = numRings * 5;
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();
        const time = state.clock.elapsedTime;

        for (let ring = 0; ring < numRings; ring++) {
            // Move ring forward, wrap when it passes camera
            let z = -ring * 5 + tunnelOffset.current;
            while (z > 10) z -= tunnelLength;

            // Morph radius with bass and wave motion
            const baseRadius = 5 + bass * 3 + Math.sin(time * 2 + ring * 0.5) * 2;
            const radiusMorph = mid * 2 * Math.cos(time * 3 + ring * 0.3);
            const radius = baseRadius + radiusMorph;

            // Bigger cubes
            const scale = 0.8 + high * 0.5 + Math.sin(time * 4 + ring) * 0.2;

            for (let item = 0; item < itemsPerRing; item++) {
                const angleOffset = colorTime.current + bass * Math.PI * 2;
                const angle = (item / itemsPerRing) * Math.PI * 2 + angleOffset;

                // Morph position with wave
                const wave = Math.sin(time * 5 + ring * 0.5 + item * 0.5) * energy * 2;
                const x = Math.cos(angle) * radius + wave;
                const y = Math.sin(angle) * radius + Math.cos(time * 3 + item * 0.2) * energy * 1.5;

                // Individual rotation for each cube
                const rotation = time + ring * 0.2 + item * 0.1;
                matrix.makeRotationFromEuler(new THREE.Euler(rotation, rotation * 0.5, rotation * 0.3));
                matrix.scale(new THREE.Vector3(scale, scale, scale));
                matrix.setPosition(x, y, z);
                instancedRef.current.setMatrixAt(ring * itemsPerRing + item, matrix);

                // Color with more variation
                const hue = (colorTime.current * 0.3 + ring * 0.05 + item * 0.02) % 1;
                const saturation = 0.7 + mid * 0.3;
                const lightness = 0.4 + energy * 0.4 + Math.sin(time * 2 + item) * 0.1;
                color.setHSL(hue, saturation, lightness);
                instancedRef.current.setColorAt(ring * itemsPerRing + item, color);
            }
        }

        instancedRef.current.instanceMatrix.needsUpdate = true;
        if (instancedRef.current.instanceColor) {
            instancedRef.current.instanceColor.needsUpdate = true;
        }
    });

    return (
        <>
            <instancedMesh ref={instancedRef} args={[undefined, undefined, totalInstances]}>
                <boxGeometry args={[1.5, 1.5, 1.5]} />
                <meshBasicMaterial />
            </instancedMesh>
            <ambientLight intensity={0.5} />
        </>
    );
}
