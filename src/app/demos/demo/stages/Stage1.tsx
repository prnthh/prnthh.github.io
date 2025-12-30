"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useMusic } from "../MusicProvider";
import * as THREE from "three";

export default function Stage1() {
    const { audioData, elementColor, audioRef } = useMusic();
    const squaresRef = useRef<THREE.Mesh[]>([]);
    const centerRef = useRef<THREE.Mesh>(null);
    const [spinning, setSpinning] = useState(false);

    // Start spinning corner cubes when music starts
    useEffect(() => {
        if (audioRef.current && !audioRef.current.paused && audioData.currentTime > 0) {
            setSpinning(true);
        }
    }, [audioRef, audioData.currentTime]);

    useFrame(() => {
        // Normalize from RMS values (approx 0-180 range) to 0-1
        const bassNorm = Math.min(audioData.bass / 180, 1);
        const midNorm = Math.min(audioData.mid / 180, 1);
        const highNorm = Math.min(audioData.high / 180, 1);

        // Scale and rotate corner squares only if music is playing
        squaresRef.current.forEach((square, i) => {
            if (square) {
                if (spinning) {
                    const phase = (i / squaresRef.current.length) * Math.PI * 2;
                    const timePulse = Math.sin(Date.now() * 0.003 + phase) * 0.5 + 0.5;

                    // Mid drives the rhythmic pulsing, high adds shimmer
                    const scale = 0.7 + midNorm * 0.6 + highNorm * 0.2 + timePulse * 0.1;
                    square.scale.set(scale, scale, 1);

                    // Rotate each cube individually
                    square.rotation.z += 0.02 + bassNorm * 0.03;
                } else {
                    // Keep static when not playing
                    square.scale.set(1, 1, 1);
                }

                // Update color
                (square.material as THREE.MeshBasicMaterial).color.setHex(elementColor);
            }
        });

        // Center square - hint animation (subtle pulse) even when stopped
        if (centerRef.current) {
            if (spinning) {
                // Full animation when playing
                const scale = 1 + bassNorm * 0.8;
                centerRef.current.scale.set(scale, scale, 1);
                centerRef.current.rotation.z += 0.02 + bassNorm * 0.03;
            } else {
                // Subtle hint animation when stopped
                const hintPulse = Math.sin(Date.now() * 0.001) * 0.1 + 1;
                centerRef.current.scale.set(hintPulse, hintPulse, 1);
                centerRef.current.rotation.z += 0.005;
            }

            // Update color
            (centerRef.current.material as THREE.MeshBasicMaterial).color.setHex(elementColor);
        }
    });

    return (
        <group>
            {/* Four corner squares */}
            {[
                { x: -3, y: -3 },
                { x: 3, y: -3 },
                { x: 3, y: 3 },
                { x: -3, y: 3 },
            ].map((pos, i) => (
                <mesh
                    key={i}
                    position={[pos.x, pos.y, 0]}
                    ref={(el) => {
                        if (el) squaresRef.current[i] = el;
                    }}
                >
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>
            ))}

            {/* Center square */}
            <mesh ref={centerRef}>
                <planeGeometry args={[1.2, 1.2]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
        </group>
    );
}
