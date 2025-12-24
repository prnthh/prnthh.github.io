"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMusic } from "./MusicProvider";
import { Html } from "@react-three/drei";

// Helper type for text animations
interface TextAnimation {
    text: string;
    startBeat: number;
    startZ: number;
}

interface ActiveText extends TextAnimation {
    id: number;
}

export default function AudioVisualizer() {
    const { audioData } = useMusic();
    const instancedRef = useRef<THREE.InstancedMesh>(null);
    const tunnelOffset = useRef(0);
    const colorTime = useRef(0);
    const [activeTexts, setActiveTexts] = useState<ActiveText[]>([]);
    const textGroupRefs = useRef<Map<number, THREE.Group>>(new Map());

    // Define text animations - easy to add more!
    const textAnimations: TextAnimation[] = [
        { text: "POCKIT GAME CORP PRESENTS", startBeat: 6, startZ: -50 },
        // Add more text here:
        { text: "NOBODY MAKES GAMES ANYMORE", startBeat: 18, startZ: -50 },
    ];

    const numRings = 8; // Reduced for clearer ASCII visibility
    const itemsPerRing = 10; // Slightly reduced for cleaner look
    const totalInstances = numRings * itemsPerRing;
    const lastBeatCountRef = useRef(0);

    // Create matrices for instances
    const { matrices, colors } = useMemo(() => {
        const matrices = new Float32Array(totalInstances * 16);
        const colors = new Float32Array(totalInstances * 3);
        const matrix = new THREE.Matrix4();

        for (let ring = 0; ring < numRings; ring++) {
            const z = -ring * 8; // Increased spacing for better depth perception
            const radius = 6; // Slightly larger radius

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
        const beatCount = audioData.beatCount;

        colorTime.current += delta * 0.5;
        tunnelOffset.current += (10 + energy * 20) * delta;

        // Add/remove text based on beat count - only check when beat changes
        if (beatCount > 0 && beatCount !== lastBeatCountRef.current) {
            lastBeatCountRef.current = beatCount;

            setActiveTexts(prev => {
                const newActiveTexts = [...prev];
                let hasChanges = false;

                textAnimations.forEach((anim, index) => {
                    const isActive = beatCount >= anim.startBeat && beatCount < anim.startBeat + 10;
                    const alreadyActive = newActiveTexts.some(t => t.startBeat === anim.startBeat);

                    if (isActive && !alreadyActive) {
                        console.log(`✓ Activating text at beat ${beatCount}:`, anim.text);
                        newActiveTexts.push({ ...anim, id: index });
                        hasChanges = true;
                    } else if (!isActive && alreadyActive) {
                        const filteredTexts = newActiveTexts.filter(t => t.startBeat !== anim.startBeat);
                        if (filteredTexts.length !== newActiveTexts.length) {
                            console.log(`✗ Deactivating text at beat ${beatCount}:`, anim.text);
                            newActiveTexts.length = 0;
                            newActiveTexts.push(...filteredTexts);
                            hasChanges = true;
                        }
                    }
                });

                return hasChanges ? newActiveTexts : prev;
            });
        }

        // Update active text positions
        activeTexts.forEach(text => {
            const group = textGroupRefs.current.get(text.id);
            if (group) {
                // Keep text at fixed position
                group.position.z = text.startZ;
                group.scale.setScalar(1);
            }
        });

        const tunnelLength = numRings * 8; // Match the spacing
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();
        const time = state.clock.elapsedTime;

        for (let ring = 0; ring < numRings; ring++) {
            // Move ring forward, wrap when it passes camera
            let z = -ring * 8 + tunnelOffset.current; // Match the spacing
            while (z > 10) z -= tunnelLength;

            // Morph radius with bass and wave motion - more pronounced
            const baseRadius = 6 + bass * 4 + Math.sin(time * 2 + ring * 0.5) * 2.5;
            const radiusMorph = mid * 3 * Math.cos(time * 3 + ring * 0.3);
            const radius = baseRadius + radiusMorph;

            // Bigger cubes for better ASCII visibility
            const scale = 1.2 + high * 0.8 + Math.sin(time * 4 + ring) * 0.3;

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
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial />
            </instancedMesh>

            {activeTexts.map(text => (
                <group
                    key={text.id}
                    ref={(ref) => {
                        if (ref) textGroupRefs.current.set(text.id, ref);
                        else textGroupRefs.current.delete(text.id);
                    }}
                >
                    <Html
                        position={[0, 0, 0]}
                        transform
                        occlude
                        style={{
                            fontSize: '64px',
                            fontWeight: 'bold',
                            color: 'white',
                            textShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                        }}
                    >
                        <div>{text.text}</div>
                    </Html>
                </group>
            ))}

            <ambientLight intensity={0.5} />
        </>
    );
}
