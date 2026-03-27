"use client";

import { Environment } from "@react-three/drei";

import { GameCanvas } from "react-three-game";
import { useCanvasReady } from "@/app/sketches/loading/GameWithLoader";
import { Csm } from "@/shared/Csm";
import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import { useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import NavigableWorld from "./NavigableContext";
import NavigableAgent from "./NavigableAgent";

function ReadyNotifier() {
    useCanvasReady();
    return null;
}

export default function HomeGame() {
    return (
        <Controls>
            <GameCanvas camera={{ position: [0, 3, 5], rotation: [-0.2, 0, 0], fov: 50 }}>
                <Csm>
                    <ambientLight intensity={0.5} />
                    <Scene />

                </Csm>

                <Environment background frames={1}>
                    <mesh>
                        <sphereGeometry args={[50, 64, 64]} />
                        <meshBasicMaterial
                            color="#87CEEB"
                            side={2}
                            depthWrite={false}
                            fog={false}
                        />
                    </mesh>
                </Environment>

                <ReadyNotifier />
            </GameCanvas>
        </Controls>
    );
}

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
