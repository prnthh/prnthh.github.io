"use client";

import { useEffect, useRef, useState } from "react";

import { useFrame } from "@react-three/fiber";
import { Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { PrefabRoot, Prefab, GameCanvas } from "react-three-game";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import MultiplayerProvider from "@/shared/multiplayer/MultiplayerProvider";
import LocalPlayer from "@/shared/multiplayer/LocalPlayer";
import OtherPlayers from "@/shared/multiplayer/OtherPlayers";
import { useSyncedClock } from "@/shared/multiplayer/MultiplayerProvider";

import killbox from "../../sketches/tools/prefabeditor/samples/killboxlobby.json";
import ButtonBox from "../mechanics/Button";
import { Text } from 'three-text/three/react';
import MapPicker from "./MapPicker";


export default function Game({ onCanvasReady }: { onCanvasReady?: () => void }) {
    const [currentMap, setCurrentMap] = useState<Prefab>(killbox);

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

