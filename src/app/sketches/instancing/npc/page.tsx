"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Box, OrbitControls, useTexture } from "@react-three/drei";
import { useEffect, useState } from "react";
import MovableTarget from "@/shared/MovableTarget";
import Ped from "@/shared/ped/physics/ped";

export default function Home() {
    const [target, setTarget] = useState<[number, number, number] | undefined>([0, 0, -2])

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas camera={{ position: [0, 4, 4] }} shadows>
                    <Physics debug>
                        <Ped modelOffset={[0, -0.5, 0]} model="/rigga/rigga.glb" position={target} />
                        <MovableTarget setPosition={setTarget} />


                        <RandomPedSpawner />

                        <Floor />
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 10]} castShadow />
                        <OrbitControls makeDefault />
                    </Physics>
                </Canvas>
            </div>
        </div >
    );
}

const Floor = () => {
    const floor = useTexture({ map: '/textures/floor/checker/FloorsCheckerboard_S_Diffuse.jpg' })
    return (
        <RigidBody type="fixed">
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial {...floor} />
            </mesh>
        </RigidBody>
    );
}

const RandomPedSpawner = () => {
    // Grid parameters
    const gridRows = 5;
    const gridCols = 4;
    const spacing = 2.5;
    const maxVisibleRows = 4;
    const [visibleRows, setVisibleRows] = useState<number[]>([0, 1, 2, 3]);
    const [grid, setGrid] = useState<{ id: string; position: [number, number, number] }[][]>([]);

    useEffect(() => {
        // Precompute all grid positions
        const newGrid: { id: string; position: [number, number, number] }[][] = [];
        let id = 0;
        for (let row = 0; row < gridRows; row++) {
            const rowNpcs = [];
            for (let col = 0; col < gridCols; col++) {
                const x = (col - (gridCols - 1) / 2) * spacing;
                const z = (row - (gridRows - 1) / 2) * spacing;
                rowNpcs.push({
                    id: `${row}_${col}_${Date.now()}_${id++}`,
                    position: [x, 0, z] as [number, number, number],
                });
            }
            newGrid.push(rowNpcs);
        }
        setGrid(newGrid);
        setVisibleRows([0, 1, 2, 3]);
        let startRow = 0;
        const interval = setInterval(() => {
            startRow = (startRow + 1) % gridRows;
            const rows: number[] = [];
            for (let i = 0; i < maxVisibleRows; i++) {
                rows.push((startRow + i) % gridRows);
            }
            setVisibleRows(rows);
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    // Flatten the visible rows into a single array of NPCs
    const npcs = visibleRows.flatMap(rowIdx => grid[rowIdx] || []);

    return (
        <>
            {npcs.map((npc) => (
                <RandomPedBehavior key={npc.id} npc={npc} />
            ))}
        </>
    );
};

const RandomPedBehavior = ({ npc }: { npc: { id: string; position: [number, number, number] } }) => {
    const [position, setPosition] = useState<[number, number, number]>(npc.position);
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        const scheduleNext = () => {
            const nextDelay = 3000 + Math.random() * 4000;
            intervalId = setTimeout(() => {
                setPosition(prev => {
                    const dx = (Math.random() - 0.5) * 4;
                    const dz = (Math.random() - 0.5) * 4;
                    return [prev[0] + dx, prev[1], prev[2] + dz];
                });
                scheduleNext();
            }, nextDelay);
        };
        scheduleNext();
        return () => clearTimeout(intervalId);
    }, []);
    return (
        <>
            <Ped modelOffset={[0, -0.5, 0]} model="/rigga/rigga2.glb" position={position} />
        </>
    );
};
