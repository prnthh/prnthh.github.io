"use client";
import { GameCanvas } from "react-three-game";
import { MapProvider, useMap } from "./MapProvider";
import { MapEditorProvider, useMapEditor } from "./MapEditorProvider";
import { MapTiles, MapTilesRef } from "./MapTile";
import { Map2DCanvas } from "./Map2DCanvas";
import { MapControls, PerspectiveCamera } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useCallback, useRef, useEffect } from "react";
import { FirstPersonController } from "../react-three-controller";
import { DemoEnvironment } from "@/shared/debug/DemoWorld";
import SynchronizedPointer from "./SynchronizedPointer";


const MAP_CONFIG = { startX: -1, endX: 1, startZ: -1, endZ: 1, tileSize: 100, tileSizePx: 256 };

function SceneContent() {
    const { isDrawing, setIsDrawing, clearPreview, brush, setMapTilesRef, paintAt, pointerRef, editorMode, brushMode } = useMapEditor();
    const { gridConfig } = useMap();
    const isBrushMode = editorMode === "edit" && brushMode === "brush";
    const mapTilesRef = useRef<MapTilesRef>(null);

    // Register the ref with the editor provider
    useEffect(() => {
        setMapTilesRef(mapTilesRef.current);
    }, [setMapTilesRef]);

    const handlePointerMove = useCallback((e: any) => {
        e.stopPropagation();
        const worldPos: [number, number, number] = [e.point.x, e.point.y, e.point.z];

        // Update pointer ref without triggering re-renders
        pointerRef.current = worldPos;

        // Always paint (preview when not drawing, commit when drawing)
        const [px, py] = gridConfig.worldToPixel(e.point.x, e.point.z, MAP_CONFIG.tileSize);
        paintAt(px, py, isDrawing);
    }, [gridConfig, paintAt, pointerRef, isDrawing]);

    const handlePointerDown = useCallback((e: any) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setIsDrawing(true);

        // Paint immediately on click
        const [px, py] = gridConfig.worldToPixel(e.point.x, e.point.z, MAP_CONFIG.tileSize);
        paintAt(px, py, true);
    }, [setIsDrawing, gridConfig, paintAt]);

    const handlePointerUp = useCallback((e: any) => {
        e.stopPropagation();
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
                physics={editorMode === "play"}
                tileSize={MAP_CONFIG.tileSize}
                viewRadius={2}
                paintMode={brush.mode}
                onPointerMove={isBrushMode ? handlePointerMove : undefined}
                onPointerDown={isBrushMode ? handlePointerDown : undefined}
                onPointerUp={isBrushMode ? handlePointerUp : undefined}
                onPointerLeave={isBrushMode ? handlePointerLeave : undefined}
            />

            {editorMode !== "play" ? (
                <>
                    <PerspectiveCamera makeDefault position={[-100, 100, 0]}>
                        <MapControls makeDefault target={[0, 0, 0]} enableRotate={brushMode === "move"} enabled={!isDrawing} />
                    </PerspectiveCamera>
                    <gridHelper args={[500, 500, `white`, `gray`]} />
                    {isBrushMode && <SynchronizedPointer />}
                </>
            ) : (
                <>
                    <FirstPersonController spawnPosition={[0, 10, 0]} />
                    <DemoEnvironment />
                </>
            )}
        </Physics>
    );
}

function PageContent() {
    const { editorMode, setEditorMode } = useMapEditor();

    return (
        <>
            <GameCanvas>
                <SceneContent />
            </GameCanvas>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {(["play", "edit"] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => setEditorMode(m)}
                        className={`px-4 py-2 rounded border transition-colors ${editorMode === m
                            ? "bg-blue-500 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                    >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                ))}
            </div>

            <Map2DCanvas />
        </>
    );
}

export default function Page() {
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
                    <PageContent />
                </MapEditorProvider>
            </MapProvider>
        </div>
    );
}