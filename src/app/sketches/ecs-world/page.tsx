"use client";

import { useEffect } from "react";
import { GameCanvas } from "react-three-game"
import { Box, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { WorldProvider, useQuery, useTrait, useTarget, useActions } from "koota/react";
import { actions, Position, Rocket, Station, Targeting, world } from "./ecs/world";


/* ======================================================
   React — Bootstrap
====================================================== */

function Bootstrap() {
    const { spawnStation, spawnRocket, tick, clear } =
        useActions(actions);

    useEffect(() => {
        spawnStation(10, 10);
        spawnStation(30, 12);
        spawnStation(20, 26);

        spawnRocket(4, 6);
        spawnRocket(4, 18);

        const id = setInterval(tick, 16);
        return () => {
            clearInterval(id);
            clear();
        };
    }, []);

    return null;
}

/* ======================================================
   React — Views
====================================================== */

function StationRenderer() {
    const stations = useQuery(Position, Station);
    return stations.map((e) => <StationView key={e} entity={e} />);
}

function StationView({ entity }: { entity: any }) {
    const pos = useTrait(entity, Position);
    if (!pos) return null;

    return (
        <Box args={[1, 1, 1]} position={[pos.x, 0, pos.y]}>
            <meshStandardMaterial color="green" />
        </Box>

    );
}


function RocketRenderer() {
    const rockets = useQuery(Position, Rocket);
    return rockets.map((e) => <RocketView key={e} entity={e} />);
}

function RocketView({ entity }: { entity: any }) {
    const pos = useTrait(entity, Position);
    const target = useTarget(entity, Targeting);

    return pos && (
        <Box args={[1, 1, 1]} position={[pos.x, 0, pos.y]}>
            <meshStandardMaterial color="orange" />
        </Box>

    );
}


/* ======================================================
   Page
====================================================== */

export default function Page() {
    return (
        <div className="absolute w-screen h-screen">
            <WorldProvider world={world}>

                <GameCanvas>
                    <ambientLight intensity={1} />

                    <Bootstrap />
                    <StationRenderer />
                    <RocketRenderer />


                    <PerspectiveCamera makeDefault position={[0, 10, 0]}>
                        <OrbitControls target={[10, 0, 10]} />
                    </PerspectiveCamera>
                </GameCanvas>

            </WorldProvider>

        </div>
    );
}
