"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useMusic } from "../MusicProvider";
import * as THREE from "three";

export default function Stage3() {
    const { audioData, beatCountRef } = useMusic();
    const groupRef = useRef<THREE.Group>(null);
    const lastBeatCount = useRef(0);
    const rgbSplitAmount = useRef(0);

    // Create many RGB cube clones scattered in space
    const cubes = useMemo(() => {
        const cubeSize = 1;
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const edges = new THREE.EdgesGeometry(geometry);

        const redMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
        const greenMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        const blueMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });

        const cubeGroups: { red: THREE.LineSegments, green: THREE.LineSegments, blue: THREE.LineSegments, basePos: THREE.Vector3 }[] = [];

        // Create a grid of cube triplets
        const gridSize = 2;
        const spacing = 3;

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let y = -gridSize; y <= gridSize; y++) {
                for (let z = -gridSize; z <= gridSize; z++) {
                    const basePos = new THREE.Vector3(x * spacing, y * spacing, z * spacing);

                    const red = new THREE.LineSegments(edges.clone(), redMaterial.clone());
                    const green = new THREE.LineSegments(edges.clone(), greenMaterial.clone());
                    const blue = new THREE.LineSegments(edges.clone(), blueMaterial.clone());

                    red.position.copy(basePos);
                    green.position.copy(basePos);
                    blue.position.copy(basePos);

                    cubeGroups.push({ red, green, blue, basePos });
                }
            }
        }

        return cubeGroups;
    }, []);

    useFrame(() => {
        if (!groupRef.current) return;

        const bassNorm = audioData.bass / 255;
        const currentBeat = beatCountRef.current;

        // On beat: trigger RGB split (identity disorder)
        if (currentBeat !== lastBeatCount.current) {
            lastBeatCount.current = currentBeat;
            rgbSplitAmount.current = 1; // Full split on beat
        }

        // Decay RGB split back to zero
        rgbSplitAmount.current *= 0.9; // Decay

        // Apply RGB split to all cubes
        const splitOffset = rgbSplitAmount.current * 0.2;

        cubes.forEach(({ red, green, blue, basePos }) => {
            // Red cubes drift left and up
            red.position.set(
                basePos.x - splitOffset,
                basePos.y + splitOffset,
                basePos.z - splitOffset * 0.5
            );

            // Green cubes stay at base position
            green.position.copy(basePos);

            // Blue cubes drift right and down
            blue.position.set(
                basePos.x + splitOffset,
                basePos.y - splitOffset,
                basePos.z + splitOffset * 0.5
            );
        });

        // Scale based on bass (no rotation)
        const scale = 1 + bassNorm * 0.1;
        groupRef.current.scale.set(scale, scale, scale);
    });

    return (
        <group ref={groupRef}>
            {/* Render all RGB cube clones */}
            {cubes.map((cubeGroup, i) => (
                <group key={`cube-${i}`}>
                    <primitive object={cubeGroup.red} />
                    <primitive object={cubeGroup.green} />
                    <primitive object={cubeGroup.blue} />
                </group>
            ))}
        </group>
    );
}
