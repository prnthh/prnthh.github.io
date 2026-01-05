"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Object3D } from "three";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { PrefabRoot, Prefab, GameCanvas } from "react-three-game";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import MultiplayerProvider from "@/shared/multiplayer/TrysteroMultiplayerProvider";
import LocalPlayer from "@/shared/multiplayer/LocalPlayer";
import OtherPlayers from "@/shared/multiplayer/OtherPlayers";
import { useGameEvents, useSyncedClock } from "@/shared/multiplayer/TrysteroMultiplayerProvider";

import { useTimeRNGNumber } from "@/shared/etc/TimeRNG";
import Balloon from "@/shared/physics/Balloon";
import HitBox from "@/shared/physics/HitBox";
import Ped from "@/app/react-three-controller/ped/ped";
import ModelAttachment from "@/app/react-three-controller/ped/ModelAttachment";

import killbox from "../../sketches/tools/prefabeditor/samples/killbox.json";
import test from "../../sketches/tools/prefabeditor/samples/killbox2.json";
import ButtonBox from "../mechanics/Button";
import { Text } from 'three-text/three/react';

const maps = {
    killbox: killbox as Prefab,
    test: test as Prefab
};

export default function Game({ onCanvasReady }: { onCanvasReady?: () => void }) {
    const [selectedMap, setSelectedMap] = useState<keyof typeof maps>("killbox");
    const [isMultiplayer, setIsMultiplayer] = useState(false);

    return (
        <Controls>
            <div className="items-center justify-items-center min-h-screen select-none">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 text-white">
                    <select
                        value={selectedMap}
                        onChange={(e) => {
                            const map = e.target.value as keyof typeof maps;
                            setSelectedMap(map);
                        }}
                        className="px-2 py-1 bg-gray-800 rounded"
                    >
                        <option value="killbox">Killbox</option>
                        <option value="test">Test</option>
                    </select>
                </div>

                <div
                    className="absolute top-2 right-2 z-30 text-white bg-gray-800 px-4 py-2 rounded cursor-pointer hover:bg-gray-700"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMultiplayer(!isMultiplayer);
                    }}
                >
                    {isMultiplayer ? "Online" : "Offline"}
                </div>

                <div className="w-full" style={{ height: "100vh" }}>
                    <MultiplayerWrapper isMultiplayer={isMultiplayer}>
                        <GameCanvas>
                            <InnerGame loadedMap={maps[selectedMap]} isMultiplayer={isMultiplayer} onCanvasReady={onCanvasReady} />
                        </GameCanvas>
                    </MultiplayerWrapper>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-1/2">
                    +
                </div>
            </div>
        </Controls>
    );
}

const MultiplayerWrapper = ({ isMultiplayer, children }: { isMultiplayer: boolean, children: React.ReactNode }) => {
    return isMultiplayer ? (
        <MultiplayerProvider roomId="lobby" debug>
            {children}
        </MultiplayerProvider>
    ) : (<>
        {children}
    </>);
}

function InnerGame({ loadedMap, isMultiplayer, onCanvasReady }: { loadedMap: Prefab, isMultiplayer: boolean, onCanvasReady?: () => void }) {
    const playerRef = useRef<Object3D>(null);

    useEffect(() => {
        onCanvasReady?.();
    }, [onCanvasReady]);

    return <>
        <Physics>
            <PrefabRoot data={loadedMap} />
            <LocalPlayer playerRef={playerRef} />

            <Train id="lift-main" />

            <group position={[0, 0, -15]}>
                <RandomNumberExample />

                <Balloon position={[-2, 1, 0]} />
                <HitBox debug key={2} position={[-1, 1, 0]} />
                <HitBox debug key={3} position={[0, 1, 0]} />
                <HitBox debug key={4} position={[1, 1, 0]} />
                <Balloon position={[2, 1, 0]} />
            </group>

            <ButtonBox position={[5, 1, -10]} onActivate={() => console.log("Button activated!")} />

            {<PedSpawner playerRef={playerRef} position={[0, 0, -10]} />}
            {isMultiplayer && <OtherPlayers />}
        </Physics>
        <ambientLight intensity={1} />
    </>
}


const PedSpawner = ({ position = [0, 0, 0], playerRef }: { position?: [number, number, number], playerRef: React.RefObject<Object3D | null> }) => {
    const [peds, setPeds] = useState<{ id: number, position: [number, number, number], dead?: boolean }[]>([
        { id: 1, position: position }
    ]);
    const maxPeds = 10;
    const nextIdRef = useRef(2);

    const handlePedShot = useCallback((id: number) => {
        // Mark as dead
        setPeds(prev => prev.map(p => p.id === id ? { ...p, dead: true } : p));

        // Spawn a new ped if under max
        setPeds(prev => {
            if (prev.length < maxPeds) {
                return [...prev, {
                    id: nextIdRef.current++,
                    position: position
                }];
            }
            return prev;
        });

        // Remove the dead ped after 5 seconds
        setTimeout(() => {
            setPeds(prev => prev.filter(p => p.id !== id));
        }, 5000);
    }, [position]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current) {
                const pos = new Object3D();
                playerRef.current.getWorldPosition(pos.position);
                setPeds(prevPeds =>
                    prevPeds.map(ped =>
                        ped.dead ? ped : {
                            ...ped,
                            position: [pos.position.x, pos.position.y, pos.position.z]
                        }
                    )
                );
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [playerRef]);

    return <>{peds.map(ped => <Ped
        key={ped.id}
        modelOffset={[0, -0.5, 0]}
        position={ped.position}
        model="rigga/rigga2.glb"
        onBulletHit={() => handlePedShot(ped.id)}
    >
        {/* <DialogCollider radius={3} height={1.2}>Ah hello</DialogCollider> */}
        <ModelAttachment
            model="/models/environment/Katana.glb"
            attachpoint="mixamorigRightHand"
            offset={[2, 0, 0]}
            scale={[100, 100, 100]}
            rotation={[0.7, 0, -1]}
        />
    </Ped>)}</>
}

const Train = ({ position = [10, 0, -10], id = "lift-main" }: { position?: [number, number, number], id?: string }) => {
    const rbRef = useRef<RapierRigidBody>(null);
    const { getSyncedClock, initSyncedClock } = useSyncedClock();
    const fallback = useRef(Date.now());

    useEffect(() => { initSyncedClock?.(id) }, [id, initSyncedClock]);

    useFrame(() => {
        const t = getSyncedClock?.(id) ?? (initSyncedClock ? null : fallback.current);
        if (!rbRef.current || t === null) return;
        const c = ((Date.now() - t) / 1000) % 10;
        rbRef.current.setNextKinematicTranslation({ x: position[0], y: (c < 5 ? c : 10 - c) / 5 * 9, z: position[2] });
    });

    return <RigidBody ref={rbRef} type='kinematicPosition' position={position}>
        <mesh castShadow><boxGeometry args={[4, 0.1, 8]} /><meshStandardMaterial color="red" /></mesh>
    </RigidBody>
}

Text.setHarfBuzzPath('/fonts/hb.wasm');

const RandomNumberExample = () => {
    const randomNum = useTimeRNGNumber({ min: 0, max: 100 });
    const randomNum2 = useTimeRNGNumber({ min: 0, max: Math.PI * 2, seedOffset: 42 });

    const width = 5;

    return <>
        <group position={[-width / 2, 2, 0]}>
            <Text font="/fonts/NimbusSanL-Reg.woff" size={0.5} depth={0} layout={{ align: 'center', width: width }}>
                {`today's random numbers: ${randomNum.toFixed()} and ${randomNum2.toFixed()}`}
            </Text>
        </group>
    </>
}