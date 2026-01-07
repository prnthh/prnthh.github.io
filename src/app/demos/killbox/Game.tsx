"use client";

import { useEffect, useRef, useState } from "react";
import { Object3D } from "three";

import { useFrame } from "@react-three/fiber";
import { Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { PrefabRoot, Prefab, GameCanvas } from "react-three-game";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import MultiplayerProvider from "@/shared/multiplayer/MultiplayerProvider";
import LocalPlayer from "@/shared/multiplayer/LocalPlayer";
import OtherPlayers from "@/shared/multiplayer/OtherPlayers";
import { useSyncedClock } from "@/shared/multiplayer/MultiplayerProvider";

import killbox from "../../sketches/tools/prefabeditor/samples/killbox.json";
import test from "../../sketches/tools/prefabeditor/samples/killbox2.json";
import ButtonBox from "../mechanics/Button";
import { Text } from 'three-text/three/react';

const maps = {
    killbox: killbox as Prefab,
    test: test as Prefab
};

export default function Game({ onCanvasReady }: { onCanvasReady?: () => void }) {
    const [currentMap, setCurrentMap] = useState<Prefab>(maps.killbox);

    return (
        <Controls>
            <div className="items-center justify-items-center min-h-screen select-none">
                <MapPicker onMapChange={setCurrentMap} />

                <div className="w-full" style={{ height: "100vh" }}>
                    <MultiplayerProvider roomId="lobby" debug>
                        <GameCanvas>
                            <InnerGame loadedMap={currentMap} onCanvasReady={onCanvasReady} />
                        </GameCanvas>
                    </MultiplayerProvider>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-1/2">
                    +
                </div>
            </div>
        </Controls>
    );
}

function MapPicker({ onMapChange }: { onMapChange: (map: Prefab) => void }) {
    const [selectedMap, setSelectedMap] = useState<keyof typeof maps | 'custom'>('killbox');
    const [customMap, setCustomMap] = useState<Prefab | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    setCustomMap(json as Prefab);
                    setSelectedMap('custom');
                    onMapChange(json as Prefab);
                } catch (error) {
                    console.error('Failed to parse JSON:', error);
                    alert('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        }
    };

    return <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 text-white flex gap-2">
        <select
            value={selectedMap}
            onChange={(e) => {
                const mapKey = e.target.value as keyof typeof maps | 'custom';
                setSelectedMap(mapKey);
                if (mapKey !== 'custom') {
                    onMapChange(maps[mapKey]);
                } else if (customMap) {
                    onMapChange(customMap);
                }
            }}
            className="px-2 py-1 bg-black/75 rounded"
        >
            <option value="killbox">Killbox</option>
            <option value="test">Test</option>
            {customMap && <option value="custom">Custom</option>}
        </select>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
        />
        <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 bg-black/75  rounded"
        >
            Upload JSON
        </button>
    </div>;
}

function InnerGame({ loadedMap, onCanvasReady }: { loadedMap: Prefab, onCanvasReady?: () => void }) {

    useEffect(() => {
        onCanvasReady?.();
    }, [onCanvasReady]);

    return <>
        <Physics>
            <PrefabRoot data={loadedMap} />
            <LocalPlayer />

            <Train id="lift-main" />

            <ButtonBox position={[5, 1, -10]} onActivate={() => console.log("Button activated!")} />
            <OtherPlayers />
        </Physics>
        <ambientLight intensity={1} />
    </>
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

