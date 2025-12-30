"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useMusic } from "../MusicProvider";
import * as THREE from "three";

export default function Stage4() {
    const { audioData, beatCountRef } = useMusic();
    const groupRef = useRef<THREE.Group>(null);
    const lastBeatCount = useRef(0);
    const rgbSplitAmount = useRef(0);

    // Use instancing for massive performance - thousands of cubes!
    const { redMesh, greenMesh, blueMesh, positions } = useMemo(() => {
        const cubeSize = 0.4;
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const edges = new THREE.EdgesGeometry(geometry);

        // Create huge grid
        const gridSize = 8; // 17x17x17 = 4913 cubes per color = ~15K cubes total!
        const spacing = 1.5;
        const count = Math.pow(gridSize * 2 + 1, 3);

        // Store base positions
        const positions: THREE.Vector3[] = [];
        let index = 0;

        for (let x = -gridSize; x <= gridSize; x++) {
            for (let y = -gridSize; y <= gridSize; y++) {
                for (let z = -gridSize; z <= gridSize; z++) {
                    positions.push(new THREE.Vector3(x * spacing, y * spacing, z * spacing));
                    index++;
                }
            }
        }

        // Create instanced meshes for each color
        const redMesh = new THREE.InstancedMesh(
            edges,
            new THREE.LineBasicMaterial({ color: 0xff0000 }),
            count
        );
        const greenMesh = new THREE.InstancedMesh(
            edges.clone(),
            new THREE.LineBasicMaterial({ color: 0x00ff00 }),
            count
        );
        const blueMesh = new THREE.InstancedMesh(
            edges.clone(),
            new THREE.LineBasicMaterial({ color: 0x0000ff }),
            count
        );

        // Set initial transforms
        const matrix = new THREE.Matrix4();
        positions.forEach((pos, i) => {
            matrix.setPosition(pos);
            redMesh.setMatrixAt(i, matrix);
            greenMesh.setMatrixAt(i, matrix);
            blueMesh.setMatrixAt(i, matrix);
        });

        redMesh.instanceMatrix.needsUpdate = true;
        greenMesh.instanceMatrix.needsUpdate = true;
        blueMesh.instanceMatrix.needsUpdate = true;

        return { redMesh, greenMesh, blueMesh, positions };
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
        rgbSplitAmount.current *= 0.88; // Faster decay for show-off effect

        // Apply RGB split to all instances using instanced transforms
        const splitOffset = rgbSplitAmount.current * 0.15;
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();

        positions.forEach((basePos, i) => {
            // Red instances drift left and up
            position.set(
                basePos.x - splitOffset,
                basePos.y + splitOffset,
                basePos.z - splitOffset * 0.5
            );
            matrix.setPosition(position);
            redMesh.setMatrixAt(i, matrix);

            // Green instances stay at base position
            matrix.setPosition(basePos);
            greenMesh.setMatrixAt(i, matrix);

            // Blue instances drift right and down
            position.set(
                basePos.x + splitOffset,
                basePos.y - splitOffset,
                basePos.z + splitOffset * 0.5
            );
            matrix.setPosition(position);
            blueMesh.setMatrixAt(i, matrix);
        });

        redMesh.instanceMatrix.needsUpdate = true;
        greenMesh.instanceMatrix.needsUpdate = true;
        blueMesh.instanceMatrix.needsUpdate = true;

        // Scale based on bass
        const scale = 1 + bassNorm * 0.08;
        groupRef.current.scale.set(scale, scale, scale);

        // Camera movement for show-off effect
        groupRef.current.rotation.y = Math.sin(Date.now() * 0.0002) * 0.3;
        groupRef.current.rotation.x = Math.sin(Date.now() * 0.0003) * 0.2;
    });

    return (
        <group ref={groupRef}>
            {/* Render thousands of RGB cubes with instancing - show off! */}
            <primitive object={redMesh} />
            <primitive object={greenMesh} />
            <primitive object={blueMesh} />
        </group>
    );
}
