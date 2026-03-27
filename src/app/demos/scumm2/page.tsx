"use client";

import { useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { GameCanvas } from "react-three-game";

import NavigableWorld from "./NavigableContext";
import NavigableAgent from "./NavigableAgent";
import { ShadowLight } from "@/shared/lighting/ShadowLight";

// ============================================================================
// Standing agent positions
// ============================================================================
const STANDING_AGENTS: [number, number, number][] = [
    [-3, 0, -2],   // agent A – left zone
    [3, 0, -2],    // agent B – right zone
    [0, 1.5, -7],    // agent C – on platform
];

// Ramp geometry constants
const RAMP_ANGLE = Math.atan2(1.5, 3.5); // rise 1.5 over run 3.5
const RAMP_LENGTH = Math.sqrt(1.5 * 1.5 + 3.5 * 3.5);

export default function Scumm2Page() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas camera={{ position: [0, 3, 5], rotation: [-0.2, 0, 0], fov: 50 }}>
                    <ambientLight intensity={1.5} />
                    <ShadowLight debug />
                    <Scene />
                </GameCanvas>
            </div>
        </div>
    );
}

// ============================================================================
// Scene
// ============================================================================

const Scene = () => {
    const [playerTarget, setPlayerTarget] = useState<[number, number, number] | undefined>(undefined);

    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const p = e.point;
        setPlayerTarget([p.x, p.y, p.z]);
    };

    return (
        <NavigableWorld>
            {/* ── Ground ──────────────────────────────────────────── */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} onPointerDown={handleClick}>
                <planeGeometry args={[64, 64]} />
                <meshStandardMaterial color="#7a8a7a" />
            </mesh>

            <mesh receiveShadow position={[0, 0.75, -10]} onPointerDown={handleClick}>
                <boxGeometry args={[8, 1.5, 8]} />
                <meshStandardMaterial color="#6a7a8a" />
            </mesh>

            {/* ── Ramp (top edge meets platform front at z=9, y=1.5) */}
            <mesh
                receiveShadow
                position={[1, 0.75, -4.25]}
                rotation={[RAMP_ANGLE, 0, 0]}
                onPointerDown={handleClick}
            >
                <boxGeometry args={[1, 0.15, RAMP_LENGTH]} />
                <meshStandardMaterial color="#7a8a6a" />
            </mesh>

            {/* ── Standing agents ──────────────────────────────────── */}
            {STANDING_AGENTS.map((pos, i) => (
                <NavigableAgent
                    key={`standing-${i}`}
                    position={pos}
                    showModel
                    basePath="/models/human/rigga/"
                    model="/models/human/rigga/rigga.glb"
                    height={1.5}
                />
            ))}

            {/* ── Player agent (click-to-move) ─────────────────────── */}
            <NavigableAgent
                position={[0, 0, 0]}

                target={playerTarget}
                showModel

                basePath="/models/human/onimilio/"
                model="/models/human/onimilio/rigged.glb"
                height={1.5}
            />
        </NavigableWorld>
    );
};