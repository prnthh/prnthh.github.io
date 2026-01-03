"use client";
import { GameCanvas } from "react-three-game";
import { MapProvider, useMap } from "./MapProvider";
import { MapEditorProvider, useMapEditor } from "./MapEditorProvider";
import { MapTiles, MapTilesRef } from "./MapTile";
import { Map2DCanvas } from "./Map2DCanvas";
import { MapControls, PerspectiveCamera } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useState, useCallback, useRef, useEffect } from "react";
import { FirstPersonController } from "../react-three-controller";
import { DemoEnvironment } from "@/shared/debug/DemoWorld";
import SynchronizedPointer from "./SynchronizedPointer";


const MAP_CONFIG = { startX: -1, endX: 1, startZ: -1, endZ: 1, tileSize: 100, tileSizePx: 256 };

function SceneContent({
    mode
}: {
    mode: "play" | "move" | "brush";
}) {
    const { isDrawing, setIsDrawing, clearPreview, paintMode, setMapTilesRef, paintAt, pointerRef } = useMapEditor();
    const { gridConfig } = useMap();
    const isBrushMode = mode === "brush";
    const mapTilesRef = useRef<MapTilesRef>(null);

    // Register the ref with the editor provider
    useEffect(() => {
        setMapTilesRef(mapTilesRef.current);
    }, [setMapTilesRef]);

    const handlePointerMove = useCallback((e: any) => {
        const worldPos: [number, number, number] = [e.point.x, e.point.y, e.point.z];

        // Update pointer ref without triggering re-renders
        pointerRef.current = worldPos;

        // Always paint (preview when not drawing, commit when drawing)
        const [px, py] = gridConfig.worldToPixel(e.point.x, e.point.z, MAP_CONFIG.tileSize);
        paintAt(px, py, isDrawing);
    }, [gridConfig, paintAt, pointerRef, isDrawing]);

    const handlePointerDown = useCallback((e: any) => {
        if (e.button !== 0) return;
        setIsDrawing(true);

        // Paint immediately on click
        const [px, py] = gridConfig.worldToPixel(e.point.x, e.point.z, MAP_CONFIG.tileSize);
        paintAt(px, py, true);
    }, [setIsDrawing, gridConfig, paintAt]);

    const handlePointerUp = useCallback(() => {
        setIsDrawing(false);
    }, [setIsDrawing]);

    const handlePointerLeave = useCallback(() => {
        pointerRef.current = null;
        clearPreview();
    }, [clearPreview, pointerRef]);

    return (
        <Physics>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <MapTiles
                ref={mapTilesRef}
                startX={MAP_CONFIG.startX}
                startZ={MAP_CONFIG.startZ}
                endX={MAP_CONFIG.endX}
                endZ={MAP_CONFIG.endZ}
                physics={mode === "play"}
                tileSize={MAP_CONFIG.tileSize}
                viewRadius={2}
                paintMode={paintMode}
                onPointerMove={isBrushMode ? handlePointerMove : undefined}
                onPointerDown={isBrushMode ? handlePointerDown : undefined}
                onPointerUp={isBrushMode ? handlePointerUp : undefined}
                onPointerLeave={isBrushMode ? handlePointerLeave : undefined}
            />

            {mode !== "play" ? (
                <>
                    <PerspectiveCamera makeDefault position={[-100, 100, 0]}>
                        <MapControls target={[0, 0, 0]} enableRotate={mode === "move"} />
                    </PerspectiveCamera>
                    {isBrushMode && <SynchronizedPointer />}
                </>
            ) : (
                <>
                    <FirstPersonController spawnPosition={[20, 10, 20]} />
                    <DemoEnvironment />
                </>
            )}
        </Physics>
    );
}

export default function Page() {
    const [mode, setMode] = useState<"play" | "move" | "brush">("move");

    return (
        <div className="w-screen h-screen">
            <MapProvider
                startX={MAP_CONFIG.startX}
                endX={MAP_CONFIG.endX}
                startZ={MAP_CONFIG.startZ}
                endZ={MAP_CONFIG.endZ}
                tileSizePx={MAP_CONFIG.tileSizePx}
            >
                <MapEditorProvider>
                    <GameCanvas>
                        <SceneContent
                            mode={mode}
                        />
                    </GameCanvas>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                        {(["play", "move", "brush"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`px-4 py-2 rounded border transition-colors ${mode === m
                                    ? "bg-blue-500 text-white border-blue-600"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                    }`}
                            >
                                {m.charAt(0).toUpperCase() + m.slice(1)}
                            </button>
                        ))}
                    </div>

                    <Map2DCanvas />
                </MapEditorProvider>
            </MapProvider>
        </div>
    );
}