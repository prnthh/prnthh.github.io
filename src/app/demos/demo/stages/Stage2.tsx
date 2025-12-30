"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useMusic } from "../MusicProvider";
import * as THREE from "three";

export default function Stage2() {
    const { audioData, elementColor } = useMusic();
    const layersRef = useRef<THREE.Line[]>([]);

    // Create concentric polygons with radial spokes
    const geometry = useMemo(() => {
        const lines: THREE.Line[] = [];
        const numLayers = 3; // Reduced from 5
        const sides = 8; // Reduced from 16

        // Create concentric polygons only (no radial spokes)
        // Using TubeGeometry for much thicker "lines" that look like areas
        for (let layer = 0; layer < numLayers; layer++) {
            const radius = 1.5 + layer * 1.5; // Increased spacing from 0.8 to 1.5
            const points = Array.from({ length: sides + 1 }).map((_, i) => {
                const angle = (i / sides) * Math.PI * 2;
                return new THREE.Vector3(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    0
                );
            });

            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeometry = new THREE.TubeGeometry(curve, sides * 2, 0.15, 8, true); // Thick tube: 0.15 radius
            const material = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(tubeGeometry, material);
            lines.push(mesh as any); // Store as mesh but treat as line for ref compatibility
        }

        return lines;
    }, []);

    useFrame(() => {
        const bassNorm = Math.min(audioData.bass / 180, 1);
        const midNorm = Math.min(audioData.mid / 180, 1);
        const highNorm = Math.min(audioData.high / 180, 1);

        // Animate each layer independently
        layersRef.current.forEach((line, i) => {
            if (line) {
                const phase = (i / layersRef.current.length) * Math.PI * 2;
                const timePulse = Math.sin(Date.now() * 0.002 + phase) * 0.5 + 0.5;

                // Expand/contract with bass
                const baseScale = 1 + bassNorm * 0.5 + timePulse * midNorm * 0.3;
                line.scale.set(baseScale, baseScale, 1);

                // Rotate layers in alternating directions
                const rotationSpeed = (i % 2 === 0 ? 1 : -1) * (0.01 + highNorm * 0.02);
                line.rotation.z += rotationSpeed;

                // Update color (now MeshBasicMaterial)
                (line.material as THREE.MeshBasicMaterial).color.setHex(elementColor);
            }
        });
    });

    return (
        <group>
            {geometry.map((line, i) => (
                <primitive
                    key={`layer-${i}`}
                    object={line}
                    ref={(el: THREE.Line) => {
                        if (el) layersRef.current[i] = el;
                    }}
                />
            ))}
        </group>
    );
}
