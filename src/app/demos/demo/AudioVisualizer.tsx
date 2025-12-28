"use client";

import { useRef, useMemo, useState, Fragment } from "react";
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
        { text: "POCKIT GAME CORP\nPRESENTS", startTime: 5, startZ: -50 },
        { text: "THE SCENE IS DEAD", startTime: 15, startZ: -50 },
        { text: ">> INITIALIZING", startTime: 25, startZ: -50 },
        { text: "SYSTEM OVERRIDE", startTime: 32, startZ: -50 },
        { text: "[ CHROMATIC UNLOCK ]", startTime: 45, startZ: -50 },
    ];

    // Hacker color palette - classic terminal/BSOD colors only
    const TERMINAL_GREEN = new THREE.Color(0x00FF00);  // Classic terminal green
    const HACKER_CYAN = new THREE.Color(0x00FFFF);     // Cyan
    const BSOD_BLUE = new THREE.Color(0x0000FF);       // Classic BSOD blue
    const PURE_WHITE = new THREE.Color(0xFFFFFF);
    const PURE_BLACK = new THREE.Color(0x000000);

    // Get color based on stage and index
    const getHackerColor = (colorMode: string, time: number, index: number, energy: number): THREE.Color => {
        const color = new THREE.Color();

        switch (colorMode) {
            case 'solid-black':
                // Pure black cubes
                color.setRGB(0, 0, 0);
                return color;
            case 'solid-white':
                // Pure white cubes
                color.setRGB(1, 1, 1);
                return color;
            case 'cyan-glitch':
                // Cyan that hard-switches to terminal green on beats
                if (energy > 0.5 || Math.random() < energy * 0.4) {
                    color.copy(TERMINAL_GREEN);
                } else {
                    color.copy(HACKER_CYAN);
                }
                return color;
            case 'neon-mix':
                // Cycle through hacker colors: cyan, green, blue
                const mixIndex = Math.floor((time * 0.8 + index * 0.15) % 3);
                if (mixIndex === 0) color.copy(HACKER_CYAN);
                else if (mixIndex === 1) color.copy(TERMINAL_GREEN);
                else color.copy(BSOD_BLUE);
                return color;
            case 'white-accent':
                // White with hacker color accents
                if (index % 3 === 0) color.copy(HACKER_CYAN);
                else if (index % 5 === 0) color.copy(TERMINAL_GREEN);
                else if (index % 7 === 0) color.copy(BSOD_BLUE);
                else color.copy(PURE_WHITE);
                return color;
            case 'neon-strobe':
                // Strobing between hacker colors based on energy
                const strobeVal = Math.floor(time * 8 + index * 0.3) % 3;
                if (energy > 0.7) {
                    // High energy = pure white flash
                    color.copy(PURE_WHITE);
                } else if (strobeVal === 0) color.copy(HACKER_CYAN);
                else if (strobeVal === 1) color.copy(TERMINAL_GREEN);
                else color.copy(BSOD_BLUE);
                return color;
            default:
                return color.copy(HACKER_CYAN);
        }
    };

    // Get background color based on current time
    const getBackgroundColor = (currentTime: number): string => {
        if (currentTime < 40) {
            // Stages 1-3: White background
            return 'white';
        } else {
            // Stage 4+: Black background
            return 'black';
        }
    };

    // Stage-based configuration with various parameters - now based on time (seconds)
    const getStageConfig = (currentTime: number) => {
        if (currentTime < 10) {
            // Stage 1: White bg, black cubes - minimal geometric, subtle movement
            return {
                numRings: 1,
                itemsPerRing: 4,
                rotationSpeed: 0,
                cubeRotation: false,
                radiusMorph: true,
                waveEffect: false,
                tunnelSpeed: 0,
                baseRadius: 2.5,
                ringSpacing: 8,
                scalePulse: true,
                baseScale: 0.6,
                helixMode: false,
                colorMode: 'solid-black' as const,
                geometryMode: 'cross' as const,
                centerPieces: { enabled: true, count: 1, spreadSpeed: 1, splitMode: 'pulse' as const },
            };
        } else if (currentTime < 20) {
            // Stage 2: White bg, black cubes - proper 3x3 grid
            return {
                numRings: 12,
                itemsPerRing: 9,
                rotationSpeed: 0,
                cubeRotation: false,
                radiusMorph: false,
                waveEffect: false,
                tunnelSpeed: 0.12,
                baseRadius: 4,
                ringSpacing: 1.5,
                scalePulse: false,
                baseScale: 0.35,
                helixMode: false,
                colorMode: 'solid-black' as const,
                geometryMode: 'grid' as const,
                centerPieces: { enabled: true, count: 4, spreadSpeed: 0.3, splitMode: 'cross' as const },
            };
        } else if (currentTime < 30) {
            // Stage 3: White bg, cyan cubes - filled scatter pattern
            return {
                numRings: 8,
                itemsPerRing: 16,
                rotationSpeed: 0.15,
                cubeRotation: false,
                radiusMorph: false,
                waveEffect: false,
                tunnelSpeed: 0.25,
                baseRadius: 5,
                ringSpacing: 2.5,
                scalePulse: true,
                baseScale: 0.5,
                helixMode: false,
                colorMode: 'cyan-glitch' as const,
                geometryMode: 'scatter' as const,
                centerPieces: { enabled: true, count: 4, spreadSpeed: 0.8, splitMode: 'cross' as const },
            };
        } else if (currentTime < 40) {
            // Stage 4: Black bg, white cubes - dramatic flip (30-40s)
            return {
                numRings: 8,
                itemsPerRing: 12,
                rotationSpeed: 0.5,
                cubeRotation: true,
                radiusMorph: false,
                waveEffect: false,
                tunnelSpeed: 0.8,
                baseRadius: 5,
                ringSpacing: 4,
                scalePulse: true,
                baseScale: 0.5,
                helixMode: false,
                colorMode: 'solid-white' as const,
                geometryMode: 'diamond' as const,
                centerPieces: { enabled: true, count: 8, spreadSpeed: 2, splitMode: 'burst' as const },
            };
        } else if (currentTime < 55) {
            // Stage 5: Neon mix - bold color accents on black (40-55s)
            return {
                numRings: 14,
                itemsPerRing: 20,
                rotationSpeed: 1.5,
                cubeRotation: true,
                radiusMorph: true,
                waveEffect: false,
                tunnelSpeed: 1.8,
                baseRadius: 6,
                ringSpacing: 5,
                scalePulse: true,
                baseScale: 0.7,
                helixMode: false,
                colorMode: 'neon-mix' as const,
                geometryMode: 'scatter' as const,
                centerPieces: { enabled: true, count: 8, spreadSpeed: 3, splitMode: 'burst' as const },
            };
        } else {
            // Stage 6: Full neon strobe chaos
            return {
                numRings: 16,
                itemsPerRing: 20,
                rotationSpeed: 4,
                cubeRotation: true,
                radiusMorph: true,
                waveEffect: true,
                tunnelSpeed: 2.5,
                baseRadius: 6,
                ringSpacing: 6,
                scalePulse: true,
                baseScale: 0.8,
                helixMode: false,
                colorMode: 'neon-strobe' as const,
                geometryMode: 'scatter' as const,
                centerPieces: { enabled: true, count: 10, spreadSpeed: 4, splitMode: 'orbit' as const },
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
            colorMode: (smoothT < 0.5 ? currentStageConfig.current.colorMode : targetStageConfig.current.colorMode) as string,
            geometryMode: (smoothT < 0.5 ? currentStageConfig.current.geometryMode : targetStageConfig.current.geometryMode) as string,
            centerPieces: {
                enabled: smoothT < 0.5 ? currentStageConfig.current.centerPieces.enabled : targetStageConfig.current.centerPieces.enabled,
                count: Math.round(lerp(currentStageConfig.current.centerPieces.count, targetStageConfig.current.centerPieces.count, smoothT)),
                spreadSpeed: lerp(currentStageConfig.current.centerPieces.spreadSpeed, targetStageConfig.current.centerPieces.spreadSpeed, smoothT),
                splitMode: (smoothT < 0.5 ? currentStageConfig.current.centerPieces.splitMode : targetStageConfig.current.centerPieces.splitMode) as string,
            }
        } as any;

        const { numRings, itemsPerRing, rotationSpeed, cubeRotation, radiusMorph, waveEffect, tunnelSpeed, baseRadius, ringSpacing, scalePulse, baseScale, helixMode, colorMode, geometryMode, centerPieces } = currentStageConfig.current;

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
            // Move ring forward, wrap when it passes camera (unless tunnelSpeed is 0)
            let z;
            if (tunnelSpeed === 0) {
                // Fixed z position for stages with no tunnel movement (like stage 1)
                z = -5;
            } else {
                z = -ring * ringSpacing + tunnelOffset.current;
                while (z > 10) z -= tunnelLength;
            }

            // Morph radius with bass and wave motion - controlled by stage
            let radius;
            if (radiusMorph && currentTime < 10) {
                // Stage 1: Subtle pulsing - stays close to base radius
                radius = baseRadius + bass * 1.2 + Math.sin(time * 2) * 0.8;
            } else if (radiusMorph) {
                // Full morphing effect for other stages
                const radiusBase = baseRadius + bass * 2 + Math.sin(time * 2 + ring * 0.5) * 1.5;
                const radiusMorphAmount = mid * 1.5 * Math.cos(time * 3 + ring * 0.3);
                radius = radiusBase + radiusMorphAmount;
            } else {
                // Use base radius from stage config
                radius = baseRadius;
            }

            // Cube scale - controlled by stage
            const scale = scalePulse
                ? baseScale + high * 0.3 + Math.sin(time * 4 + ring) * 0.15
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

                // Geometric positioning based on geometryMode
                let x, y;
                const baseAngle = (item / itemsPerRing) * Math.PI * 2 + angleOffset;

                switch (geometryMode) {
                    case 'cross':
                        // Cross pattern - only at 0, 90, 180, 270 degrees
                        const crossAngle = Math.floor(item / (itemsPerRing / 4)) * (Math.PI / 2);
                        x = Math.cos(crossAngle) * radius;
                        y = Math.sin(crossAngle) * radius;
                        break;
                    case 'grid':
                        // Grid pattern - proper 3x3 square formation
                        const gridSize = 3;
                        const gridX = (item % gridSize) - 1; // -1, 0, 1
                        const gridY = Math.floor(item / gridSize) - 1; // -1, 0, 1
                        const spacing = radius / 1.5;
                        x = gridX * spacing;
                        y = gridY * spacing;
                        break;
                    case 'scatter':
                        // Symmetric scatter - layered concentric patterns with rotational symmetry
                        // Create 3 concentric rings with perfect radial symmetry
                        const layer = item % 3; // Which concentric ring (0, 1, 2)
                        const itemsInLayer = Math.floor(itemsPerRing / 3);
                        const indexInLayer = Math.floor(item / 3);

                        // Radii for the three layers (inner, middle, outer)
                        const layerRadii = [radius * 0.3, radius * 0.65, radius * 1.0];
                        const scatterRadius = layerRadii[layer];

                        // Perfect angular distribution within each layer
                        const scatterAngle = (indexInLayer / itemsInLayer) * Math.PI * 2 + ring * 0.2;

                        x = Math.cos(scatterAngle) * scatterRadius;
                        y = Math.sin(scatterAngle) * scatterRadius;
                        break;
                    case 'diamond':
                        // Diamond/rotated square formation
                        const diamondAngle = baseAngle + Math.PI / 4;
                        x = Math.cos(diamondAngle) * radius;
                        y = Math.sin(diamondAngle) * radius;
                        break;
                    default:
                        // Default circular/spiral
                        if (waveEffect) {
                            const wave = Math.sin(time * 5 + ring * 0.5 + item * 0.5) * energy * 2;
                            x = Math.cos(baseAngle) * radius + wave;
                            y = Math.sin(baseAngle) * radius + Math.cos(time * 3 + item * 0.2) * energy * 1.5;
                        } else {
                            x = Math.cos(baseAngle) * radius;
                            y = Math.sin(baseAngle) * radius;
                        }
                }

                // Individual rotation for each cube - controlled by stage
                if (cubeRotation) {
                    // Right angle rotations only (0, 90, 180, 270 degrees)
                    const rotationStep = Math.floor((time + ring * 0.2 + item * 0.1) * 2) * (Math.PI / 2);
                    matrix.makeRotationFromEuler(new THREE.Euler(rotationStep, 0, rotationStep));
                } else {
                    matrix.makeRotationFromEuler(new THREE.Euler(0, 0, 0));
                }
                matrix.scale(new THREE.Vector3(scale, scale, scale));
                matrix.setPosition(x, y, z);
                instancedRef.current.setMatrixAt(ring * maxItemsPerRing + item, matrix);

                // Color based on colorMode - all colors go through getHackerColor
                const hackerColor = getHackerColor(colorMode, time, ring * maxItemsPerRing + item, energy);
                color.copy(hackerColor);
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
                    case 'cross':
                        // Cross pattern - pieces move along axes at right angles
                        const crossDist = Math.abs(Math.sin(t)) * 4;
                        const axis = i % 4;
                        if (axis === 0) { x = crossDist; y = 0; }
                        else if (axis === 1) { x = -crossDist; y = 0; }
                        else if (axis === 2) { x = 0; y = crossDist; }
                        else { x = 0; y = -crossDist; }
                        z = -5 + Math.sin(t * 0.5 + i) * 1;
                        scale = 0.6 + energy * 0.25;
                        break;

                    case 'pulse':
                        // Single pulsing center piece - fixed at -5 (Stage 1)
                        x = 0;
                        y = 0;
                        z = -5; // Fixed in line with center
                        scale = 0.8 + energy * 0.5 + Math.sin(t * 3) * 0.3;
                        break;

                    case 'burst':
                        // Exploding outward from center at right angles
                        const burstAngle = (i / centerPieces.count) * Math.PI * 2;
                        const burstDist = (Math.sin(t + i * 0.5) * 0.5 + 0.5) * 8;
                        // Snap to 45-degree increments for geometric feel
                        const snappedAngle = Math.round(burstAngle / (Math.PI / 4)) * (Math.PI / 4);
                        x = Math.cos(snappedAngle) * burstDist;
                        y = Math.sin(snappedAngle) * burstDist;
                        z = -5 + Math.sin(t * 2 + i) * 3;
                        scale = 0.5 + high * 0.3;
                        break;

                    case 'orbit':
                        // Orbiting satellites at fixed angular positions
                        const orbitT = t;
                        const orbitAngle = (i / centerPieces.count) * Math.PI * 2 + orbitT;
                        // Snap to octagonal positions
                        const snappedOrbit = Math.round(orbitAngle / (Math.PI / 4)) * (Math.PI / 4);
                        const orbitRadius = 3 + Math.sin(orbitT * 2 + i) * 1;
                        x = Math.cos(snappedOrbit) * orbitRadius;
                        y = Math.sin(snappedOrbit) * orbitRadius;
                        z = -5 + Math.sin(snappedOrbit * 3) * 2;
                        scale = 0.6 + mid * 0.2;
                        break;

                    default:
                        break;
                }

                // Right-angle rotation for center pieces
                const rotStep = Math.floor(t * 2) * (Math.PI / 2);
                centerMatrix.makeRotationFromEuler(new THREE.Euler(0, 0, rotStep));
                centerMatrix.scale(new THREE.Vector3(scale, scale, scale));
                centerMatrix.setPosition(x, y, z);
                centerInstancedRef.current.setMatrixAt(i, centerMatrix);

                // Color based on colorMode - all colors go through getHackerColor
                const hackerColor = getHackerColor(colorMode, time, i, energy);
                centerColor.copy(hackerColor);
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

            {activeTexts.map(text => {
                // Determine text color based on stage (inverse of background)
                const currentTime = audioData.currentTime;
                const textColor = currentTime < 30 ? 'black' : 'white';
                const shadowColor = currentTime < 30 ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';

                return (
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
                                fontSize: '6px',
                                fontWeight: 'bold',
                                color: textColor,
                                textShadow: `
                                    1px 0 0 ${shadowColor},
                                    -1px 0 0 ${shadowColor},
                                    0 1px 0 ${shadowColor},
                                    0 -1px 0 ${shadowColor}
                                `,
                                pointerEvents: 'none',
                                userSelect: 'none',
                                whiteSpace: 'nowrap',
                                fontFamily: '"Cascadia Mono", "Fira Mono", "IBM Plex Mono", "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
                                textAlign: 'center',
                            }}
                        >
                            <div>
                                {text.text.split('\n').map((line, idx, arr) => (
                                    <Fragment key={idx}>
                                        {line}
                                        {idx < arr.length - 1 && <br />}
                                    </Fragment>
                                ))}
                            </div>
                        </Html>
                    </group>
                );
            })}

            <ambientLight intensity={0.5} />
        </>
    );
}
