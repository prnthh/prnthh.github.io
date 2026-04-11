"use client";

import { useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { GameCanvas, PrefabRoot } from "react-three-game";
import scummworld from "@public/samples/scummworld.json";

import NavigableWorld from "@/app/react-three-controller/navmesh/NavigableContext";
import NavigableAgent, { type NavigableCharacterDefinition } from "@/app/react-three-controller/navmesh/NavigableAgent";
import { ShadowLight } from "@/shared/lighting/ShadowLight";

const SCUMM_NAV_MESH_CONFIG = {
    tileSize: 16,
    cs: 0.1,
    ch: 0.1,
    walkableClimb: 4,
    maxSimplificationError: 0.8,
};

const CHARACTERS: Record<string, NavigableCharacterDefinition> = {
    rigga: {
        name: "Rigga",
        basePath: "/models/human/rigga/",
        model: "/models/human/rigga/rigga.glb",
        height: 1.5,
    },
    rigga2: {
        name: "Rigga 2",
        basePath: "/models/human/rigga/",
        model: "/models/human/rigga/rigga2.glb",
        height: 1.5,
    },
    rigga3: {
        name: "Rigga 3",
        basePath: "/models/human/rigga/",
        model: "/models/human/rigga/rigga3.glb",
        height: 1.5,
    },
    onimilio: {
        name: "Onimilio",
        basePath: "/models/human/onimilio/",
        model: "/models/human/onimilio/rigged.glb",
        height: 1.5,
    },
};

const STANDING_AGENTS = [
    { position: [-3, 0, -2] as [number, number, number], character: CHARACTERS.rigga },
    { position: [3, 0, -2] as [number, number, number], character: CHARACTERS.rigga2 },
    { position: [0, 1.5, -7] as [number, number, number], character: CHARACTERS.rigga3 },
];

export default function Game() {
    return (
        <GameCanvas camera={{ position: [0, 3, 5], rotation: [-0.2, 0, 0], fov: 50 }}>
            <ambientLight intensity={1.5} />
            <ShadowLight debug />
            <Scene />
        </GameCanvas>
    );
}

const Scene = () => {
    const [playerTarget, setPlayerTarget] = useState<[number, number, number] | undefined>(undefined);

    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const p = e.point;
        setPlayerTarget([p.x, p.y, p.z]);
    };

    return (
        <NavigableWorld navMeshConfig={SCUMM_NAV_MESH_CONFIG}>
            <group onClick={handleClick}>
                <PrefabRoot data={scummworld} />
            </group>

            {STANDING_AGENTS.map((agent, i) => (
                <NavigableAgent
                    key={`standing-${i}`}
                    position={agent.position}
                    character={agent.character}
                />
            ))}

            <NavigableAgent
                position={[0, 0, 0]}
                target={playerTarget}
                character={CHARACTERS.onimilio}
            />
        </NavigableWorld>
    );
};