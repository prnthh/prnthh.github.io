"use client";

import GameCanvas from "@/shared/GameCanvas";
import Controls from "@/shared/controls/ControlsProvider";
import MultiplayerProvider from "@/shared/multiplayer/TrysteroMultiplayerProvider";
import Game from "./Game";
import { useState } from "react";
import killbox from "../../tools/prefabeditor/samples/killbox.json";
import test from "../../tools/prefabeditor/samples/test.json";
import { Prefab } from "react-three-game";

const maps = {
    killbox: killbox as Prefab,
    test: test as Prefab
};

export default function Home() {
    const [selectedMap, setSelectedMap] = useState<keyof typeof maps>("killbox");

    const handleTap = () => {
        // Check if we're on mobile and not already in fullscreen
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                elem.requestFullscreen?.() ||
                    (elem as any).webkitRequestFullscreen?.() ||
                    (elem as any).mozRequestFullScreen?.() ||
                    (elem as any).msRequestFullscreen?.();
            }
        }
    };

    return (
        <Controls>
            <div className="items-center justify-items-center min-h-screen select-none" onClick={handleTap}>
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
                <div className="w-full" style={{ height: "100vh" }}>
                    <MultiplayerProvider roomId="lobby" debug={false}>
                        <GameCanvas>
                            <Game loadedMap={maps[selectedMap]} onCanvasReady={() => { }} />
                            <ambientLight intensity={1} />
                            <directionalLight castShadow position={[10, 10, 5]} intensity={1} />
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
