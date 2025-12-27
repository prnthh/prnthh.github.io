"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMusic } from "./MusicProvider";
import { Html } from "@react-three/drei";

// Helper type for text animations
interface TextAnimation {
    text: string;
    startTime: number; // Changed from startBeat to startTime (seconds)
    startZ: number;
}

interface ActiveText extends TextAnimation {
    id: number;
}

export default function AudioVisualizer() {
    const { audioData } = useMusic();
    const instancedRef = useRef<THREE.InstancedMesh>(null);
    const centerInstancedRef = useRef<THREE.InstancedMesh>(null); // New ref for center pieces
    const tunnelOffset = useRef(0);
    const colorTime = useRef(0);
    const [activeTexts, setActiveTexts] = useState<ActiveText[]>([]);
    const textGroupRefs = useRef<Map<number, THREE.Group>>(new Map());

    // Define text animations - easy to add more! (time in seconds)
    const textAnimations: TextAnimation[] = [
        { text: "POCKIT GAME CORP PRESENTS", startTime: 5, startZ: -50 },
        // Add more text here:
        { text: "THE SCENE IS DEAD", startTime: 15, startZ: -50 },
    ];

    // Stage-based configuration with various parameters - now based on time (seconds)
    const getStageConfig = (currentTime: number) => {
        if (currentTime < 10) {
            // Stage 1: Minimal - 4 static cubes with pulsing center (0-10s)
            return {
                numRings: 6,
                itemsPerRing: 4,
                rotationSpeed: 0,
                cubeRotation: false,
                radiusMorph: false,
                waveEffect: false,
                tunnelSpeed: 0.5,
                baseRadius: 6,
                ringSpacing: 8,
                scalePulse: true,
                baseScale: 0.8,
                helixMode: false,
                colorMode: 'black' as const,
                centerPieces: { enabled: true, count: 1, spreadSpeed: 1, splitMode: 'pulse' as const },
            };
        } else if (currentTime < 20) {
            // Stage 2: Single stream with splitting center pieces (10-20s)
            return {
                numRings: 12,
                itemsPerRing: 8,
                rotationSpeed: 0.5,
                cubeRotation: false,
                radiusMorph: false,
                waveEffect: false,
                tunnelSpeed: 0.08,
                baseRadius: 0.3,
                ringSpacing: 1.5,
                scalePulse: false,
                baseScale: 0.3,
                helixMode: false,
                colorMode: 'black' as const,
                centerPieces: { enabled: true, count: 2, spreadSpeed: 0.15, splitMode: 'split' as const },
            };
        } else if (currentTime < 30) {
            // Stage 3: Single helix with pulsing center (20-30s)
            return {
                numRings: 20,
                itemsPerRing: 1,
                rotationSpeed: 0,
                cubeRotation: false,
                radiusMorph: false,
                waveEffect: false,
                tunnelSpeed: 1.0,
                baseRadius: 4,
                ringSpacing: 2,
                scalePulse: false,
                baseScale: 0.6,
                helixMode: true,
                colorMode: 'colorful' as const,
                centerPieces: { enabled: true, count: 1, spreadSpeed: 0, splitMode: 'pulse' as const },
            };
        } else if (currentTime < 50) {
            // Stage 4: EXTREME with expanding center burst (30-50s)
            return {
                numRings: 10,
                itemsPerRing: 16,
                rotationSpeed: 3,
                cubeRotation: true,
                radiusMorph: true,
                waveEffect: true,
                tunnelSpeed: 2.0,
                baseRadius: 6,
                ringSpacing: 8,
                scalePulse: true,
                baseScale: 0.8,
                helixMode: false,
                colorMode: 'colorful' as const,
                centerPieces: { enabled: true, count: 8, spreadSpeed: 4, splitMode: 'burst' as const },
            };
        } else {
            // Stage 5: Tight spiral with rotating satellites (50s+)
            return {
                numRings: 8,
                itemsPerRing: 20,
                rotationSpeed: 5,
                cubeRotation: true,
                radiusMorph: false,
                waveEffect: false,
                tunnelSpeed: 2.5,
                baseRadius: 1.5,
                ringSpacing: 8,
                scalePulse: true,
                baseScale: 0.8,
                helixMode: false,
                colorMode: 'colorful' as const,
                centerPieces: { enabled: true, count: 6, spreadSpeed: 3, splitMode: 'orbit' as const },
            };
        }
    };

    const maxRings = 20;
    const maxItemsPerRing = 20;
    const totalInstances = maxRings * maxItemsPerRing;
    const lastTimeRef = useRef(0);
    const currentStageConfig = useRef(getStageConfig(0));
    const targetStageConfig = useRef(getStageConfig(0));
    const transitionProgress = useRef(0);

    // Create matrices for instances (allocate max size)
    const { matrices, colors } = useMemo(() => {
        const matrices = new Float32Array(totalInstances * 16);
        const colors = new Float32Array(totalInstances * 3);
        const matrix = new THREE.Matrix4();

        for (let ring = 0; ring < maxRings; ring++) {
            const z = -ring * 8; // Increased spacing for better depth perception
            const radius = 6; // Slightly larger radius

            for (let item = 0; item < maxItemsPerRing; item++) {
                const angle = (item / maxItemsPerRing) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                matrix.setPosition(x, y, z);
                matrix.toArray(matrices, (ring * maxItemsPerRing + item) * 16);

                // Initial color
                colors[(ring * maxItemsPerRing + item) * 3] = 1;
                colors[(ring * maxItemsPerRing + item) * 3 + 1] = 1;
                colors[(ring * maxItemsPerRing + item) * 3 + 2] = 1;
            }
        }

        return { matrices, colors };
    }, []);

    // Create matrices for center pieces
    const { centerMatrices, centerColors } = useMemo(() => {
        const centerMatrices = new Float32Array(10 * 16);
        const centerColors = new Float32Array(10 * 3);
        const matrix = new THREE.Matrix4();

        for (let i = 0; i < 10; i++) {
            matrix.identity();
            matrix.toArray(centerMatrices, i * 16);

            // Initial color (will be overwritten)
            centerColors[i * 3] = 1;
            centerColors[i * 3 + 1] = 1;
            centerColors[i * 3 + 2] = 1;
        }

        return { centerMatrices, centerColors };
    }, []);

    useFrame((state, delta) => {
        if (!instancedRef.current) return;

        // Ensure camera is centered
        state.camera.position.set(0, 0, 0);
        state.camera.lookAt(0, 0, -1);

        const bass = audioData.bass / 255;
        const mid = audioData.mid / 255;
        const high = audioData.high / 255;
        const energy = audioData.energy / 255;
        const currentTime = audioData.currentTime;

        // Update stage configuration with smooth transitions
        const newStageConfig = getStageConfig(currentTime);

        // Check if stage changed
        if (JSON.stringify(targetStageConfig.current) !== JSON.stringify(newStageConfig)) {
            targetStageConfig.current = newStageConfig;
            transitionProgress.current = 0;
        }

        // Smooth transition between stages over 5 seconds
        const transitionSpeed = delta * 0.2;
        if (transitionProgress.current < 1) {
            transitionProgress.current = Math.min(1, transitionProgress.current + transitionSpeed);
        }

        // Lerp between current and target config
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const smoothT = easeInOutCubic(transitionProgress.current);

        currentStageConfig.current = {
            numRings: Math.round(lerp(currentStageConfig.current.numRings, targetStageConfig.current.numRings, smoothT)),
            itemsPerRing: Math.round(lerp(currentStageConfig.current.itemsPerRing, targetStageConfig.current.itemsPerRing, smoothT)),
            rotationSpeed: lerp(currentStageConfig.current.rotationSpeed, targetStageConfig.current.rotationSpeed, smoothT),
            baseRadius: lerp(currentStageConfig.current.baseRadius, targetStageConfig.current.baseRadius, smoothT),
            ringSpacing: lerp(currentStageConfig.current.ringSpacing, targetStageConfig.current.ringSpacing, smoothT),
            tunnelSpeed: lerp(currentStageConfig.current.tunnelSpeed, targetStageConfig.current.tunnelSpeed, smoothT),
            baseScale: lerp(currentStageConfig.current.baseScale, targetStageConfig.current.baseScale, smoothT),
            // Boolean values switch at 50% transition
            cubeRotation: smoothT < 0.5 ? currentStageConfig.current.cubeRotation : targetStageConfig.current.cubeRotation,
            radiusMorph: smoothT < 0.5 ? currentStageConfig.current.radiusMorph : targetStageConfig.current.radiusMorph,
            waveEffect: smoothT < 0.5 ? currentStageConfig.current.waveEffect : targetStageConfig.current.waveEffect,
            scalePulse: smoothT < 0.5 ? currentStageConfig.current.scalePulse : targetStageConfig.current.scalePulse,
            helixMode: smoothT < 0.5 ? currentStageConfig.current.helixMode : targetStageConfig.current.helixMode,
            colorMode: (smoothT < 0.5 ? currentStageConfig.current.colorMode : targetStageConfig.current.colorMode) as 'black' | 'colorful',
            centerPieces: {
                enabled: smoothT < 0.5 ? currentStageConfig.current.centerPieces.enabled : targetStageConfig.current.centerPieces.enabled,
                count: Math.round(lerp(currentStageConfig.current.centerPieces.count, targetStageConfig.current.centerPieces.count, smoothT)),
                spreadSpeed: lerp(currentStageConfig.current.centerPieces.spreadSpeed, targetStageConfig.current.centerPieces.spreadSpeed, smoothT),
                splitMode: (smoothT < 0.5 ? currentStageConfig.current.centerPieces.splitMode : targetStageConfig.current.centerPieces.splitMode) as 'none' | 'cross' | 'pulse' | 'burst' | 'orbit',
            }
        } as any;

        const { numRings, itemsPerRing, rotationSpeed, cubeRotation, radiusMorph, waveEffect, tunnelSpeed, baseRadius, ringSpacing, scalePulse, baseScale, helixMode, colorMode, centerPieces } = currentStageConfig.current;

        colorTime.current += delta * 0.5;
        tunnelOffset.current += (10 + energy * 20) * delta * tunnelSpeed;

        // Add/remove text based on time - only check when time changes significantly
        if (currentTime > 0 && Math.floor(currentTime * 10) !== Math.floor(lastTimeRef.current * 10)) {
            lastTimeRef.current = currentTime;

            setActiveTexts(prev => {
                const newActiveTexts = [...prev];
                let hasChanges = false;

                textAnimations.forEach((anim, index) => {
                    const isActive = currentTime >= anim.startTime && currentTime < anim.startTime + 8; // Show for 8 seconds
                    const alreadyActive = newActiveTexts.some(t => t.startTime === anim.startTime);

                    if (isActive && !alreadyActive) {
                        console.log(`✓ Activating text at time ${currentTime.toFixed(1)}s:`, anim.text);
                        newActiveTexts.push({ ...anim, id: index });
                        hasChanges = true;
                    } else if (!isActive && alreadyActive) {
                        const filteredTexts = newActiveTexts.filter(t => t.startTime !== anim.startTime);
                        if (filteredTexts.length !== newActiveTexts.length) {
                            console.log(`✗ Deactivating text at time ${currentTime.toFixed(1)}s:`, anim.text);
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

        const tunnelLength = numRings * ringSpacing;
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();
        const time = state.clock.elapsedTime;

        // Hide all instances first
        for (let i = 0; i < totalInstances; i++) {
            matrix.makeScale(0, 0, 0);
            instancedRef.current.setMatrixAt(i, matrix);
        }

        for (let ring = 0; ring < numRings; ring++) {
            // Move ring forward, wrap when it passes camera
            let z = -ring * ringSpacing + tunnelOffset.current;
            while (z > 10) z -= tunnelLength;

            // Morph radius with bass and wave motion - controlled by stage
            let radius;
            if (radiusMorph) {
                // Full morphing effect
                const radiusBase = baseRadius + bass * 4 + Math.sin(time * 2 + ring * 0.5) * 2.5;
                const radiusMorphAmount = mid * 3 * Math.cos(time * 3 + ring * 0.3);
                radius = radiusBase + radiusMorphAmount;
            } else {
                // Use base radius from stage config
                radius = baseRadius;
            }

            // Cube scale - controlled by stage
            const scale = scalePulse
                ? baseScale + high * 0.5 + Math.sin(time * 4 + ring) * 0.2
                : baseScale; // Fixed scale when not pulsing

            for (let item = 0; item < itemsPerRing; item++) {
                // Apply rotation speed based on stage
                let angleOffset;
                if (helixMode) {
                    // Helix mode: rotate each ring progressively to create spiral
                    angleOffset = ring * 0.3; // Each ring rotates a bit more
                } else if (rotationSpeed > 0) {
                    angleOffset = (colorTime.current + bass * Math.PI * 2) * rotationSpeed;
                } else {
                    angleOffset = 0;
                }
                const angle = (item / itemsPerRing) * Math.PI * 2 + angleOffset;

                // Morph position with wave - controlled by stage
                let x, y;
                if (waveEffect) {
                    const wave = Math.sin(time * 5 + ring * 0.5 + item * 0.5) * energy * 2;
                    x = Math.cos(angle) * radius + wave;
                    y = Math.sin(angle) * radius + Math.cos(time * 3 + item * 0.2) * energy * 1.5;
                } else {
                    // No wave effect - straight positioning
                    x = Math.cos(angle) * radius;
                    y = Math.sin(angle) * radius;
                }

                // Individual rotation for each cube - controlled by stage
                if (cubeRotation) {
                    const rotation = time + ring * 0.2 + item * 0.1;
                    matrix.makeRotationFromEuler(new THREE.Euler(rotation, rotation * 0.5, rotation * 0.3));
                } else {
                    matrix.makeRotationFromEuler(new THREE.Euler(0, 0, 0));
                }
                matrix.scale(new THREE.Vector3(scale, scale, scale));
                matrix.setPosition(x, y, z);
                instancedRef.current.setMatrixAt(ring * maxItemsPerRing + item, matrix);

                // Color with more variation or black based on stage
                if (colorMode === 'black') {
                    color.setRGB(0, 0, 0);
                } else {
                    const hue = (colorTime.current * 0.3 + ring * 0.05 + item * 0.02) % 1;
                    const saturation = 0.7 + mid * 0.3;
                    const lightness = 0.4 + energy * 0.4 + Math.sin(time * 2 + item) * 0.1;
                    color.setHSL(hue, saturation, lightness);
                }
                instancedRef.current.setColorAt(ring * maxItemsPerRing + item, color);
            }
        }

        instancedRef.current.instanceMatrix.needsUpdate = true;
        if (instancedRef.current.instanceColor) {
            instancedRef.current.instanceColor.needsUpdate = true;
        }

        // Render center pieces based on config
        if (centerInstancedRef.current && centerPieces.enabled && centerPieces.count > 0) {
            const centerMatrix = new THREE.Matrix4();
            const centerColor = new THREE.Color();

            for (let i = 0; i < centerPieces.count; i++) {
                const t = time * centerPieces.spreadSpeed;
                let x = 0, y = 0, z = 0;
                let scale = 1;

                switch (centerPieces.splitMode) {
                    case 'split':
                        // Split vertically into two halves and rejoin
                        const splitDistance = Math.abs(Math.sin(t)) * 3; // 0 to 3, smooth in/out
                        if (i === 0) {
                            x = -splitDistance; // Left half
                        } else {
                            x = splitDistance; // Right half
                        }
                        y = 0;
                        z = -5; // In front of camera
                        scale = 0.7 + energy * 0.2;
                        break;

                    case 'pulse':
                        // Single pulsing center piece
                        x = 0;
                        y = 0;
                        z = -5; // In front of camera
                        scale = 0.8 + energy * 0.3;
                        break;

                    case 'burst':
                        // Exploding outward from center
                        const burstAngle = (i / centerPieces.count) * Math.PI * 2 + t * 0.5;
                        const burstDist = (Math.sin(t + i * 0.5) * 0.5 + 0.5) * 8;
                        x = Math.cos(burstAngle) * burstDist;
                        y = Math.sin(burstAngle) * burstDist;
                        z = -5 + Math.sin(t * 2 + i) * 2; // In front of camera
                        scale = 0.5 + high * 0.2;
                        break;

                    case 'orbit':
                        // Orbiting satellites
                        const orbitAngle = (i / centerPieces.count) * Math.PI * 2 + t;
                        const orbitRadius = 3 + Math.sin(t * 2 + i) * 1;
                        x = Math.cos(orbitAngle) * orbitRadius;
                        y = Math.sin(orbitAngle) * orbitRadius;
                        z = -5 + Math.sin(orbitAngle * 3) * 1.5; // In front of camera
                        scale = 0.6 + mid * 0.15;
                        break;

                    default:
                        break;
                }

                // No rotation for center pieces
                centerMatrix.identity();
                centerMatrix.scale(new THREE.Vector3(scale, scale, scale));
                centerMatrix.setPosition(x, y, z);
                centerInstancedRef.current.setMatrixAt(i, centerMatrix);

                // Color based on stage - black for stages 1 & 2, colorful for 3+
                if (colorMode === 'black') {
                    centerColor.setRGB(0, 0, 0);
                } else {
                    const hue = (colorTime.current * 0.5 + i * 0.1) % 1;
                    centerColor.setHSL(hue, 0.8, 0.5);
                }
                centerInstancedRef.current.setColorAt(i, centerColor);
            }

            // Hide unused instances
            for (let i = centerPieces.count; i < 10; i++) {
                centerMatrix.makeScale(0, 0, 0);
                centerInstancedRef.current.setMatrixAt(i, centerMatrix);
            }

            centerInstancedRef.current.instanceMatrix.needsUpdate = true;
            if (centerInstancedRef.current.instanceColor) {
                centerInstancedRef.current.instanceColor.needsUpdate = true;
            }
        } else if (centerInstancedRef.current) {
            // Hide all center pieces when disabled
            const centerMatrix = new THREE.Matrix4();
            for (let i = 0; i < 10; i++) {
                centerMatrix.makeScale(0, 0, 0);
                centerInstancedRef.current.setMatrixAt(i, centerMatrix);
            }
            centerInstancedRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <>
            <instancedMesh ref={instancedRef} args={[undefined, undefined, totalInstances]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial />
            </instancedMesh>

            {/* Center pieces - max 10 instances */}
            <instancedMesh ref={centerInstancedRef} args={[undefined, undefined, 10]}>
                <boxGeometry args={[1.5, 1.5, 1.5]} />
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
