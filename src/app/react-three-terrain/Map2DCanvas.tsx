"use client";

import { useEffect, useRef } from "react";
import { useMapEditor } from "./MapEditorProvider";
import { useMap } from "./MapProvider";

export function Map2DCanvas() {
    const { gridConfig, isLoaded } = useMap();
    const { canvasSize: CANVAS_SIZE } = gridConfig;
    const {
        brush,
        setBrush,
        isDrawing,
        setIsDrawing,
        modifiedTiles,
        paintAt,
        clearPreview,
        downloadModifiedTiles,
        loadAllTiles,
        setCanvasRefs,
        editorMode,
        brushMode,
        setBrushMode,
    } = useMapEditor();

    const heightCanvasRef = useRef<HTMLCanvasElement>(null);
    const colorCanvasRef = useRef<HTMLCanvasElement>(null);

    // Set canvas refs when mounted
    useEffect(() => {
        setCanvasRefs({
            height: heightCanvasRef.current,
            color: colorCanvasRef.current,
        });
    }, [setCanvasRefs]);

    // Load tiles when map is ready
    useEffect(() => {
        if (isLoaded && heightCanvasRef.current && colorCanvasRef.current) {
            loadAllTiles();
        }
    }, [isLoaded, loadAllTiles]);

    const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return [
            Math.floor((e.clientX - rect.left) * CANVAS_SIZE / rect.width),
            Math.floor((e.clientY - rect.top) * CANVAS_SIZE / rect.height),
        ] as const;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const [x, y] = getCanvasCoords(e);
        setIsDrawing(true);
        paintAt(x, y, true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const [x, y] = getCanvasCoords(e);
        paintAt(x, y, isDrawing);
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
    };

    const handleMouseLeave = () => {
        setIsDrawing(false);
        clearPreview();
    };

    // Only show in edit mode
    if (editorMode !== "edit") return null;

    return (
        <div className="absolute bottom-0 right-0 bg-black/80 p-4 rounded-tl-lg">
            <div className="flex flex-col gap-3">
                {/* Mode Toggle Buttons */}
                <div className="flex gap-2">
                    {(["move", "brush"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setBrushMode(m)}
                            className={`px-4 py-2 rounded border transition-colors ${brushMode === m
                                ? "bg-blue-500 text-white border-blue-600"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                }`}
                        >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2">
                    <select
                        value={brush.mode}
                        onChange={(e) => setBrush({ mode: e.target.value as "height" | "color" })}
                        className="px-2 py-1 rounded bg-gray-700 text-white"
                    >
                        <option value="height">Height Map</option>
                        <option value="color">Color Map</option>
                    </select>

                    <div className="flex items-center gap-2">
                        <label className="text-white text-sm">Brush Size:</label>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            value={brush.size}
                            onChange={(e) => setBrush({ size: Number(e.target.value) })}
                            className="flex-1"
                        />
                        <span className="text-white text-sm w-8">{brush.size}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-white text-sm">Softness:</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={brush.softness}
                            onChange={(e) => setBrush({ softness: Number(e.target.value) })}
                            className="flex-1"
                        />
                        <span className="text-white text-sm w-8">{(brush.softness * 100).toFixed(0)}%</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setBrush({ shape: "circle" })}
                            className={`px-3 py-1 rounded text-sm ${brush.shape === "circle" ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-200"}`}
                        >
                            Circle
                        </button>
                        <button
                            onClick={() => setBrush({ shape: "square" })}
                            className={`px-3 py-1 rounded text-sm ${brush.shape === "square" ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-200"}`}
                        >
                            Square
                        </button>
                    </div>

                    {brush.mode === "height" ? (
                        <div className="flex items-center gap-2">
                            <label className="text-white text-sm">Height:</label>
                            <input
                                type="range"
                                min="0"
                                max="255"
                                value={brush.height}
                                onChange={(e) => setBrush({ height: Number(e.target.value) })}
                                className="flex-1"
                            />
                            <span className="text-white text-sm w-8">{brush.height}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <label className="text-white text-sm">Color:</label>
                            <input
                                type="color"
                                value={brush.color}
                                onChange={(e) => setBrush({ color: e.target.value })}
                                className="flex-1 h-8"
                            />
                        </div>
                    )}

                    <button
                        onClick={downloadModifiedTiles}
                        disabled={modifiedTiles.size === 0}
                        className="px-3 py-2 bg-blue-600 text-white rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Download Modified Tiles ({modifiedTiles.size})
                    </button>
                </div>

                {/* Canvas */}
                <div className="relative border border-gray-600">
                    <canvas
                        ref={heightCanvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        className={brush.mode === "height" ? "block" : "hidden"}
                        style={{ width: "300px", height: "300px", imageRendering: "pixelated" }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    />
                    <canvas
                        ref={colorCanvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        className={brush.mode === "color" ? "block" : "hidden"}
                        style={{ width: "300px", height: "300px", imageRendering: "pixelated" }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    />
                </div>
            </div>
        </div>
    );
}
