"use client";

import { useRef, useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useMusic } from "./MusicProvider";
import * as THREE from "three";

interface Particle {
    id: number;
    birthTime: number;
    targetX: number;
    targetY: number;
}

export default function BasslineEffect() {
    const { audioData, elementColor, beatCountRef } = useMusic();
    const { viewport } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const lastBeatCount = useRef(0);
    const particleIdCounter = useRef(0);

    // Emit particles on beat
    useEffect(() => {
        const currentBeatCount = beatCountRef.current;
        if (currentBeatCount > lastBeatCount.current) {
            // Calculate target positions based on viewport aspect ratio
            const targetX = viewport.width / 2;
            const targetY = viewport.height / 2;

            // New beat detected! Emit 4 particles to corners
            const newParticles: Particle[] = [
                { id: particleIdCounter.current++, birthTime: Date.now(), targetX: -targetX, targetY: -targetY },
                { id: particleIdCounter.current++, birthTime: Date.now(), targetX: targetX, targetY: -targetY },
                { id: particleIdCounter.current++, birthTime: Date.now(), targetX: targetX, targetY: targetY },
                { id: particleIdCounter.current++, birthTime: Date.now(), targetX: -targetX, targetY: targetY },
            ];
            setParticles(prev => [...prev, ...newParticles]);
            lastBeatCount.current = currentBeatCount;
        }

        // Clean up old particles (older than 1 second)
        const now = Date.now();
        setParticles(prev => prev.filter(p => now - p.birthTime < 1000));
    }, [audioData.beatCount, beatCountRef, viewport.width, viewport.height]);

    return (
        <group ref={groupRef}>
            {/* Render beat particles */}
            {particles.map(particle => {
                const age = (Date.now() - particle.birthTime) / 1000; // 0 to 1
                const progress = Math.min(age, 1);

                // Ease out cubic for smooth deceleration
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                const x = particle.targetX * easeProgress;
                const y = particle.targetY * easeProgress;
                const opacity = 1 - progress; // Fade out as it travels
                const size = 0.1 + progress * 0.1; // Grow slightly

                return (
                    <mesh key={particle.id} position={[x, y, 0]}>
                        <boxGeometry args={[size, size, size]} />
                        <meshBasicMaterial color={elementColor} transparent opacity={opacity} />
                    </mesh>
                );
            })}
        </group>
    );
}
