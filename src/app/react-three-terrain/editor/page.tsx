"use client";
import { GameCanvas } from "react-three-game";
import { MapProvider, useMap } from "../MapProvider";
import { MapEditorProvider, useMapEditor } from "./MapEditorProvider";
import { MapTiles, MapTilesRef } from "../MapTile";
import { Map2DCanvas } from "./Map2DCanvas";
import { MapControls, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useCallback, useRef, useEffect, useState } from "react";
import { FirstPersonController } from "../../react-three-controller";
import { DemoEnvironment } from "@/shared/debug/DemoWorld";
import SynchronizedPointer from "./SynchronizedPointer";


function PageContent({
    config,
    setConfig,
    tileSize,
    setTileSize,
    tileSizePx,
    setTileSizePx
}: {
    config: { startX: number; endX: number; startZ: number; endZ: number };
    setConfig: (config: { startX: number; endX: number; startZ: number; endZ: number }) => void;
    tileSize: number;
    setTileSize: (size: number) => void;
    tileSizePx: number;
    setTileSizePx: (size: number) => void;
}) {
    const { isDrawing, setIsDrawing, clearPreview, brush, setMapTilesRef, paintAt, pointerRef, editorMode, brushMode, setEditorMode } = useMapEditor();
    const { loadImage } = useMap();
    const isBrushMode = editorMode === "edit" && brushMode === "brush";
    const mapTilesRef = useRef<MapTilesRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate from config
    const gridSize = config.endX - config.startX + 1;
    const gridStart = config.startX;

    // Register the ref with the editor provider
    useEffect(() => {
        setMapTilesRef(mapTilesRef.current);
    }, [setMapTilesRef]);

    const handlePointerMove = useCallback((e: any) => {
        e.stopPropagation();

        // Get the intersection object with local coordinates
        const intersection = e.intersections?.[0];
        if (!intersection) return;

        // Use the point in world space for visual pointer
        const worldPos: [number, number, number] = [e.point.x, e.point.y, e.point.z];
        pointerRef.current = worldPos;

        // Get UV coordinates if available, otherwise use face/object info
        const uv = intersection.uv;
        if (uv) {
            // UV coordinates are normalized (0-1), convert to pixel coordinates
            const px = Math.floor(uv.x * tileSizePx);
            const py = Math.floor((1 - uv.y) * tileSizePx); // Flip Y as UVs are bottom-up

            // Determine which tile was hit from the object's position
            const tileX = Math.floor(intersection.object.position.x / tileSize);
            const tileZ = Math.floor(intersection.object.position.z / tileSize);

            // Convert to canvas coordinates
            const canvasX = (tileX - config.startX) * tileSizePx + px;
            const canvasY = (tileZ - config.startZ) * tileSizePx + py;

            paintAt(canvasX, canvasY, isDrawing);
        }
    }, [config, paintAt, pointerRef, isDrawing, tileSize, tileSizePx]);

    const handlePointerDown = useCallback((e: any) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setIsDrawing(true);

        // Get the intersection object with local coordinates
        const intersection = e.intersections?.[0];
        if (!intersection) return;

        const uv = intersection.uv;
        if (uv) {
            const px = Math.floor(uv.x * tileSizePx);
            const py = Math.floor((1 - uv.y) * tileSizePx);

            const tileX = Math.floor(intersection.object.position.x / tileSize);
            const tileZ = Math.floor(intersection.object.position.z / tileSize);

            const canvasX = (tileX - config.startX) * tileSizePx + px;
            const canvasY = (tileZ - config.startZ) * tileSizePx + py;

            paintAt(canvasX, canvasY, true);
        }
    }, [setIsDrawing, config, paintAt, tileSize, tileSizePx]);

    const handlePointerUp = useCallback((e: any) => {
        e.stopPropagation();
        setIsDrawing(false);
    }, [setIsDrawing]);

    const handlePointerLeave = useCallback(() => {
        pointerRef.current = null;
        clearPreview();
    }, [clearPreview, pointerRef]);

    const handleImageLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        loadImage(file);
    }, [loadImage]);

    return (
        <>
            <GameCanvas>
                <color attach="background" args={["#87ceeb"]} />
                <Physics>
                    <ambientLight intensity={1.5} />
                    <directionalLight castShadow position={[10, 10, 5]} intensity={1} />

                    <group position={[-tileSize / 2, 0, -tileSize / 2]}>
                        <MapTiles
                            ref={mapTilesRef}
                            startX={config.startX}
                            startZ={config.startZ}
                            endX={config.endX}
                            endZ={config.endZ}
                            physics={editorMode === "play"}
                            tileSize={tileSize}
                            viewRadius={2}
                            paintMode={brush.mode}
                            onPointerMove={isBrushMode ? handlePointerMove : undefined}
                            onPointerDown={isBrushMode ? handlePointerDown : undefined}
                            onPointerUp={isBrushMode ? handlePointerUp : undefined}
                            onPointerLeave={isBrushMode ? handlePointerLeave : undefined}
                        />
                    </group>

                    {editorMode !== "play" ? (
                        <>
                            <PerspectiveCamera makeDefault position={[-100, 100, 0]}>
                                <OrbitControls makeDefault target={[0, 0, 0]} enableRotate={brushMode === "move"} enabled={!isDrawing} />
                            </PerspectiveCamera>
                            {isBrushMode && <SynchronizedPointer />}
                        </>
                    ) : (
                        <>
                            <FirstPersonController spawnPosition={[0, 10, 0]} />
                            <DemoEnvironment />
                        </>
                    )}
                </Physics>
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

            <MapConfigPanel
                config={config}
                setConfig={setConfig}
                tileSize={tileSize}
                setTileSize={setTileSize}
                tileSizePx={tileSizePx}
                setTileSizePx={setTileSizePx}
                handleImageLoad={handleImageLoad}
                fileInputRef={fileInputRef}
            />

            <Map2DCanvas />
        </>
    );
}

const MapConfigPanel = ({
    config,
    setConfig,
    tileSize,
    setTileSize,
    tileSizePx,
    setTileSizePx,
    handleImageLoad,
    fileInputRef
}: {
    config: { startX: number; endX: number; startZ: number; endZ: number };
    setConfig: (config: { startX: number; endX: number; startZ: number; endZ: number }) => void;
    tileSize: number;
    setTileSize: (size: number) => void;
    tileSizePx: number;
    setTileSizePx: (size: number) => void;
    handleImageLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const gridSize = config.endX - config.startX + 1;
    const gridStart = config.startX;

    return (
        <div className="absolute top-4 right-4 z-30">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-3 rounded bg-white border border-gray-300 hover:bg-gray-100 transition-colors shadow-md"
                    title="Open settings"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
            ) : (
                <div className="flex flex-col gap-2 bg-white p-4 rounded border border-gray-300 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-gray-700">Settings</h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Close settings"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                        Load Image
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageLoad}
                        className="hidden"
                    />

                    <div className="border-t border-gray-300 pt-2 mt-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Grid Configuration</h3>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700 w-20">Grid Size:</label>
                            <input
                                type="number"
                                value={gridSize}
                                onChange={(e) => {
                                    const newSize = parseInt(e.target.value) || 1;
                                    setConfig({
                                        startX: gridStart,
                                        endX: gridStart + newSize - 1,
                                        startZ: gridStart,
                                        endZ: gridStart + newSize - 1,
                                    });
                                }}
                                className="w-20 px-2 py-1 border border-gray-300 rounded"
                                min="1"
                                max="10"
                            />
                            <span className="text-xs text-gray-500">tiles</span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <label className="text-sm text-gray-700 w-20">Grid Start:</label>
                            <input
                                type="number"
                                value={gridStart}
                                onChange={(e) => {
                                    const newStart = parseInt(e.target.value) || 0;
                                    setConfig({
                                        startX: newStart,
                                        endX: newStart + gridSize - 1,
                                        startZ: newStart,
                                        endZ: newStart + gridSize - 1,
                                    });
                                }}
                                className="w-20 px-2 py-1 border border-gray-300 rounded"
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-300 pt-2 mt-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Tile Configuration</h3>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700 w-20">Tile Size:</label>
                            <input
                                type="number"
                                value={tileSize}
                                onChange={(e) => setTileSize(parseInt(e.target.value) || 100)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded"
                                min="10"
                                step="10"
                            />
                            <span className="text-xs text-gray-500">units</span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <label className="text-sm text-gray-700 w-20">Texture Res:</label>
                            <input
                                type="number"
                                value={tileSizePx}
                                onChange={(e) => setTileSizePx(parseInt(e.target.value) || 256)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded"
                                min="64"
                                step="64"
                            />
                            <span className="text-xs text-gray-500">px</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function Page() {
    const [config, setConfig] = useState({ startX: -1, endX: 1, startZ: -1, endZ: 1 });
    const [tileSize, setTileSize] = useState(100);
    const [tileSizePx, setTileSizePx] = useState(256);

    return (
        <div className="w-screen h-screen">
            <MapProvider
                startX={config.startX}
                endX={config.endX}
                startZ={config.startZ}
                endZ={config.endZ}
                tileSizePx={tileSizePx}
            >
                <MapEditorProvider>
                    <PageContent
                        config={config}
                        setConfig={setConfig}
                        tileSize={tileSize}
                        setTileSize={setTileSize}
                        tileSizePx={tileSizePx}
                        setTileSizePx={setTileSizePx}
                    />
                </MapEditorProvider>
            </MapProvider>
        </div>
    );
}