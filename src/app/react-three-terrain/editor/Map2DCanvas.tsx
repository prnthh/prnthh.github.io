"use client";

import { useEffect, useRef, useState } from "react";
import { useMapEditor } from "./MapEditorProvider";
import { useMap } from "../MapProvider";

export function Map2DCanvas() {
    const { gridConfig, isLoaded } = useMap();
    const {
        brush,
        setBrush,
        modifiedTiles,
        generateRandomHeightmap,
        generateColormapFromHeightmap,
        downloadModifiedTiles,
        loadAllTiles,
        setCanvasRefs,
        editorMode,
        brushMode,
        setBrushMode,
    } = useMapEditor();
    const [isOpen, setIsOpen] = useState(true);

    const heightCanvasRef = useRef<HTMLCanvasElement>(null);
    const colorCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const height = heightCanvasRef.current;
        const color = colorCanvasRef.current;
        setCanvasRefs({ height, color });

        if (isLoaded && height && color) {
            loadAllTiles();
        }
    }, [isLoaded, loadAllTiles, setCanvasRefs]);

    // Only show in edit mode
    if (editorMode !== "edit") return null;

    return (
        <>
            <div className="w-full">
                <div className="overflow-hidden rounded-[1.5rem] border border-white/15 bg-neutral-900/92 text-white shadow-2xl backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => setIsOpen((open) => !open)}
                        className="flex w-full items-center justify-between gap-4 border-b border-white/10 px-4 py-3 text-left"
                    >
                        <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-white/45">Terrain Editor</div>
                            <div className="text-sm font-medium text-white/90">
                                {brush.mode === "height" ? "Height Tools" : "Color Tools"}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden text-xs text-white/50 sm:block">
                                {brushMode === "brush" ? "Paint" : "Navigate"}
                            </div>
                            <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                                {isOpen ? "Hide" : "Show"}
                            </div>
                        </div>
                    </button>

                    {isOpen && (
                        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto px-4 pb-4 pt-3">
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {(["move", "brush"] as const).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setBrushMode(m)}
                                            className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${brushMode === m
                                                ? "border-sky-500 bg-sky-500 text-white"
                                                : "border-white/10 bg-white/8 text-white/75 hover:bg-white/12"
                                                }`}
                                        >
                                            {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <select
                                        value={brush.mode}
                                        onChange={(e) => setBrush({ mode: e.target.value as "height" | "color" })}
                                        className="rounded-2xl border border-white/10 bg-slate-700 px-3 py-3 text-sm text-white"
                                    >
                                        <option value="height">Height Map</option>
                                        <option value="color">Color Map</option>
                                    </select>

                                    <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
                                        <label className="w-20 text-sm text-white/80">Size</label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            value={brush.size}
                                            onChange={(e) => setBrush({ size: Number(e.target.value) })}
                                            className="flex-1"
                                        />
                                        <span className="w-10 text-right text-sm text-white">{brush.size}</span>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
                                        <label className="w-20 text-sm text-white/80">Softness</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={brush.softness}
                                            onChange={(e) => setBrush({ softness: Number(e.target.value) })}
                                            className="flex-1"
                                        />
                                        <span className="w-12 text-right text-sm text-white">{(brush.softness * 100).toFixed(0)}%</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setBrush({ shape: "circle" })}
                                            className={`rounded-2xl px-3 py-2 text-sm ${brush.shape === "circle" ? "bg-sky-600 text-white" : "bg-white/10 text-white/75"}`}
                                        >
                                            Circle
                                        </button>
                                        <button
                                            onClick={() => setBrush({ shape: "square" })}
                                            className={`rounded-2xl px-3 py-2 text-sm ${brush.shape === "square" ? "bg-sky-600 text-white" : "bg-white/10 text-white/75"}`}
                                        >
                                            Square
                                        </button>
                                    </div>

                                    {brush.mode === "height" ? (
                                        <button
                                            onClick={generateRandomHeightmap}
                                            className="rounded-2xl bg-emerald-600 px-3 py-3 text-white"
                                        >
                                            Generate Random
                                        </button>
                                    ) : (
                                        <button
                                            onClick={generateColormapFromHeightmap}
                                            className="rounded-2xl bg-amber-600 px-3 py-3 text-white"
                                        >
                                            Generate From Heightmap
                                        </button>
                                    )}

                                    {brush.mode === "height" ? (
                                        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
                                            <label className="w-20 text-sm text-white/80">Height</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="255"
                                                value={brush.height}
                                                onChange={(e) => setBrush({ height: Number(e.target.value) })}
                                                className="flex-1"
                                            />
                                            <span className="w-10 text-right text-sm text-white">{brush.height}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-3">
                                                <label className="w-20 text-sm text-white/80">Color</label>
                                                <input
                                                    type="color"
                                                    value={brush.color}
                                                    onChange={(e) => setBrush({ color: e.target.value })}
                                                    className="h-10 flex-1 rounded-xl"
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: "Grass", color: "#010000" },
                                                    { label: "Rock", color: "#020000" },
                                                    { label: "Sand", color: "#030000" },
                                                ].map(({ label, color }) => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setBrush({ color })}
                                                        className={`rounded-xl px-3 py-2 text-xs border transition-all ${brush.color.toLowerCase() === color.toLowerCase()
                                                            ? "border-white scale-105"
                                                            : "border-white/10"
                                                            }`}
                                                        style={{ backgroundColor: color, color: "white", textShadow: "0 0 2px black" }}
                                                        title={label}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    <button
                                        onClick={downloadModifiedTiles}
                                        disabled={modifiedTiles.size === 0}
                                        className="rounded-2xl bg-slate-600 px-3 py-3 text-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-white/40"
                                    >
                                        Download Modified Tiles ({modifiedTiles.size})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pointer-events-none absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
                <canvas
                    ref={heightCanvasRef}
                    width={gridConfig.canvasSize}
                    height={gridConfig.canvasSize}
                />
                <canvas
                    ref={colorCanvasRef}
                    width={gridConfig.canvasSize}
                    height={gridConfig.canvasSize}
                />
            </div>
        </>
    );
}
