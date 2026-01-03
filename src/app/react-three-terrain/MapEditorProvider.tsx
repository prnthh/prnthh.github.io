"use client";

import { createContext, useContext, useRef, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import * as THREE from "three";
import { useMap, buildHeightFieldFromImageData, imageToImageData } from "./MapProvider";
import { MapTilesRef } from "./MapTile";

/**
 * MapEditorProvider handles all terrain editing functionality.
 *
 * Drawing Flow:
 * 1. Mouse down → setIsDrawing(true)
 * 2. First paintAt() call → isDrawing is still false, so tile goes to modifiedTiles immediately
 * 3. Subsequent paintAt() calls during drag → isDrawing is now true, tiles accumulate in strokeTiles
 * 4. Mouse up → handleSetIsDrawing(false) finalizes:
 *    - Updates MapProvider with final tile data
 *    - Moves all strokeTiles to modifiedTiles state
 *    - Clears strokeTiles for next stroke
 */

const cloneImageData = (data: ImageData) => {
    if (typeof ImageData === 'undefined') throw new Error('ImageData not available');
    return new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
};

const parseTileKey = (key: string) => key.split(",").map(Number) as [number, number];

const canvasCoords = (
    tileX: number,
    tileZ: number,
    startX: number,
    startZ: number,
    tileSize: number
) => ({
    canvasX: (tileX - startX) * tileSize,
    canvasZ: (tileZ - startZ) * tileSize
});

const solidImageData = (size: number, red: number, green: number, blue: number) => {
    if (typeof ImageData === 'undefined') throw new Error('ImageData not available');
    const data = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < data.length; i += 4) {
        data.set([red, green, blue, 255], i);
    }
    return new ImageData(data, size, size);
};

const makeTexture = (data: ImageData, size: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.putImageData(data, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
};

const downloadTile = (key: string, type: string, data: ImageData, size: number) => new Promise<void>(resolve => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve();

    ctx.putImageData(data, 0, 0);

    canvas.toBlob(blob => {
        if (!blob) return resolve();
        const [x, z] = parseTileKey(key);
        const anchor = document.createElement("a");
        anchor.href = URL.createObjectURL(blob);
        anchor.download = `${x}_${z}_${type}.png`;
        anchor.click();
        setTimeout(resolve, 100);
    });
});

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 255, g: 255, b: 255 };
};

type PaintMode = "height" | "color";
type BrushShape = "circle" | "square";

interface MapEditorState {
    paintMode: PaintMode; brushSize: number; brushShape: BrushShape; brushColor: string;
    brushHeight: number; brushSoftness: number; isDrawing: boolean; isLoaded: boolean;
    modifiedTiles: Map<string, Set<PaintMode>>;
}

interface MapEditorActions {
    setPaintMode: (mode: PaintMode) => void; setBrushSize: (size: number) => void;
    setBrushShape: (shape: BrushShape) => void; setBrushColor: (color: string) => void;
    setBrushHeight: (height: number) => void; setBrushSoftness: (softness: number) => void;
    setIsDrawing: (drawing: boolean) => void;
    paintAt: (x: number, y: number, commit: boolean) => void; clearPreview: () => void;
    downloadModifiedTiles: () => void; loadAllTiles: () => Promise<void>;
    setCanvasRefs: (refs: { height: HTMLCanvasElement | null; color: HTMLCanvasElement | null }) => void;
    setMapTilesRef: (ref: MapTilesRef | null) => void;
    pointerRef: React.MutableRefObject<[number, number, number] | null>;
}

type MapEditorContextType = MapEditorState & MapEditorActions;
const MapEditorContext = createContext<MapEditorContextType | null>(null);

export function useMapEditor() {
    const ctx = useContext(MapEditorContext);
    if (!ctx) throw new Error("useMapEditor must be used within MapEditorProvider");
    return ctx;
}

export function MapEditorProvider({ children }: { children: ReactNode }) {
    const { isLoaded: mapLoaded, getTile, updateTile: updateProviderTile, gridConfig } = useMap();
    const { startX, endX, startZ, endZ, tileSizePx: tileSize, canvasSize } = gridConfig;

    const blankColor = useMemo(() => typeof ImageData !== 'undefined' ? solidImageData(tileSize, 200, 200, 200) : null, [tileSize]);
    const blankHeight = useMemo(() => typeof ImageData !== 'undefined' ? solidImageData(tileSize, 200, 200, 200) : null, [tileSize]);

    const getTileImages = useCallback((tileX: number, tileZ: number) => {
        const tile = getTile(tileX, tileZ);

        // Gracefully handle missing tiles by using blank fallback data
        const height = tile?.heightImage
            ? imageToImageData(tile.heightImage, tileSize) || blankHeight!
            : blankHeight!;

        const colorImg = tile?.colormap?.image;
        const color = colorImg && (colorImg instanceof HTMLImageElement || colorImg instanceof HTMLCanvasElement || colorImg instanceof ImageBitmap)
            ? imageToImageData(colorImg as any, tileSize) || blankColor!
            : blankColor!;

        return { height, color };
    }, [getTile, tileSize, blankHeight, blankColor]);

    const [paintMode, setPaintMode] = useState<PaintMode>("color");
    const [brushSize, setBrushSize] = useState(10);
    const [brushShape, setBrushShape] = useState<BrushShape>("circle");
    const [brushColor, setBrushColor] = useState("#ffffff");
    const [brushHeight, setBrushHeight] = useState(128);
    const [brushSoftness, setBrushSoftness] = useState(0);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [modifiedTiles, setModifiedTiles] = useState<Map<string, Set<PaintMode>>>(new Map());

    // Refs for non-reactive data that doesn't need to trigger re-renders
    const pointerRef = useRef<[number, number, number] | null>(null);
    const hRef = useRef<HTMLCanvasElement | null>(null);
    const cRef = useRef<HTMLCanvasElement | null>(null);
    const tilesRef = useRef<MapTilesRef | null>(null);
    const cache = useRef(new Map<string, { height: ImageData; color: ImageData }>());
    const preview = useRef(new Set<string>());
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    // Stroke tracking - tiles modified during current drag
    const strokeTiles = useRef(new Set<string>());
    const strokeMode = useRef<PaintMode>("height");

    const getCtxs = useCallback(() => {
        const heightCtx = hRef.current?.getContext("2d", { willReadFrequently: true }), colorCtx = cRef.current?.getContext("2d", { willReadFrequently: true });
        return heightCtx && colorCtx ? { height: heightCtx, color: colorCtx } : null;
    }, []);
    const getActiveContext = useCallback(() => (paintMode === "height" ? hRef : cRef).current?.getContext("2d", { willReadFrequently: true }) ?? null, [paintMode]);
    const capture = useCallback((key: string, heightCtx: CanvasRenderingContext2D, colorCtx: CanvasRenderingContext2D) => {
        const [tileX, tileZ] = parseTileKey(key), { canvasX, canvasZ } = canvasCoords(tileX, tileZ, startX, startZ, tileSize);
        cache.current.set(key, { height: cloneImageData(heightCtx.getImageData(canvasX, canvasZ, tileSize, tileSize)), color: cloneImageData(colorCtx.getImageData(canvasX, canvasZ, tileSize, tileSize)) });
    }, [startX, startZ, tileSize]);
    const setCanvasRefs = useCallback((refs: { height: HTMLCanvasElement | null; color: HTMLCanvasElement | null }) => { hRef.current = refs.height; cRef.current = refs.color; }, []);
    const setMapTilesRef = useCallback((ref: MapTilesRef | null) => { tilesRef.current = ref; }, []);
    const intensity = (dist: number, half: number, soft: number) => soft <= 0 ? 1 : (dist / half > 1 - soft ? 1 - ((dist / half - (1 - soft)) / soft) ** 2 * (3 - 2 * ((dist / half - (1 - soft)) / soft)) : 1);

    const applyView = useCallback((tiles: Set<string>, tileData?: Map<string, { height: ImageData; color: ImageData }>) => {
        if (!tilesRef.current) return;
        const contexts = getCtxs(); if (!contexts) return;

        tiles.forEach(key => {
            const [tileX, tileZ] = parseTileKey(key), { canvasX, canvasZ } = canvasCoords(tileX, tileZ, startX, startZ, tileSize);
            // Use provided data or read from canvas
            const heightData = tileData?.get(key)?.height ?? contexts.height.getImageData(canvasX, canvasZ, tileSize, tileSize);
            const colorData = tileData?.get(key)?.color ?? contexts.color.getImageData(canvasX, canvasZ, tileSize, tileSize);

            const heightField = buildHeightFieldFromImageData(heightData, tileSize);
            tilesRef.current!.updateHeightData(key, heightField);

            const colorTexture = makeTexture(colorData, tileSize);
            if (colorTexture) tilesRef.current!.updateImageData(key, colorTexture);
        });
    }, [getCtxs, startX, startZ, tileSize]);

    const loadAllTiles = useCallback(async () => {
        if (!mapLoaded) return; const contexts = getCtxs(); if (!contexts) return; setIsLoaded(false);
        const allTiles = new Set<string>();
        for (let z = startZ; z <= endZ; z++) for (let x = startX; x <= endX; x++) {
            const { height, color } = getTileImages(x, z), canvasX = (x - startX) * tileSize, canvasZ = (z - startZ) * tileSize;
            contexts.height.putImageData(height, canvasX, canvasZ); contexts.color.putImageData(color, canvasX, canvasZ);
            capture(`${x},${z}`, contexts.height, contexts.color); allTiles.add(`${x},${z}`);
        }
        setIsLoaded(true); applyView(allTiles);
    }, [mapLoaded, getTileImages, getCtxs, capture, applyView, startX, endX, startZ, endZ, tileSize]);

    const restore = useCallback(() => {
        if (preview.current.size === 0) return; const activeContext = getActiveContext(); if (!activeContext) return;
        const tiles = new Set(preview.current); preview.current.clear();
        tiles.forEach(key => {
            const original = cache.current.get(key); if (!original) return;
            const [tileX, tileZ] = parseTileKey(key), canvasX = (tileX - startX) * tileSize, canvasZ = (tileZ - startZ) * tileSize;
            activeContext.putImageData(paintMode === "height" ? original.height : original.color, canvasX, canvasZ);
        });
        applyView(tiles);
    }, [getActiveContext, applyView, startX, startZ, tileSize, paintMode]);

    const paintAt = useCallback((x: number, y: number, commit: boolean) => {
        const activeContext = getActiveContext(); if (!activeContext) return;
        if (commit && lastPos.current?.x === x && lastPos.current?.y === y) return;
        if (commit) lastPos.current = { x, y }; if (!commit) restore();

        const halfSize = Math.floor(brushSize / 2);
        const tiles = new Set<string>(), imageData = activeContext.getImageData(0, 0, canvasSize, canvasSize);

        for (let dy = -halfSize; dy <= halfSize; dy++) for (let dx = -halfSize; dx <= halfSize; dx++) {
            const pixelX = x + dx, pixelY = y + dy;
            if (pixelX < 0 || pixelX >= canvasSize || pixelY < 0 || pixelY >= canvasSize) continue;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (brushShape === "circle" && distance > halfSize) continue;
            tiles.add(`${Math.floor(pixelX / tileSize) + startX},${Math.floor(pixelY / tileSize) + startZ}`);
            const intensityValue = intensity(distance, halfSize, brushSoftness), index = (pixelY * canvasSize + pixelX) * 4;
            if (paintMode === "height") {
                const newHeight = Math.round(imageData.data[index] + (brushHeight - imageData.data[index]) * intensityValue);
                imageData.data[index] = imageData.data[index + 1] = imageData.data[index + 2] = newHeight; imageData.data[index + 3] = 255;
            } else {
                const rgb = hexToRgb(brushColor);
                imageData.data[index] = Math.round(imageData.data[index] + (rgb.r - imageData.data[index]) * intensityValue);
                imageData.data[index + 1] = Math.round(imageData.data[index + 1] + (rgb.g - imageData.data[index + 1]) * intensityValue);
                imageData.data[index + 2] = Math.round(imageData.data[index + 2] + (rgb.b - imageData.data[index + 2]) * intensityValue);
                imageData.data[index + 3] = 255;
            }
        }
        activeContext.putImageData(imageData, 0, 0);

        // Extract tile data once for applyView
        const contexts = getCtxs();
        const tileData = new Map<string, { height: ImageData; color: ImageData }>();
        if (contexts) {
            tiles.forEach(key => {
                const [tileX, tileZ] = parseTileKey(key), { canvasX, canvasZ } = canvasCoords(tileX, tileZ, startX, startZ, tileSize);
                tileData.set(key, {
                    height: contexts.height.getImageData(canvasX, canvasZ, tileSize, tileSize),
                    color: contexts.color.getImageData(canvasX, canvasZ, tileSize, tileSize)
                });
            });
        }

        if (commit) {
            // Track stroke in progress
            if (contexts) {
                strokeMode.current = paintMode;
                tiles.forEach(key => {
                    strokeTiles.current.add(key);
                    const data = tileData.get(key);
                    if (data) cache.current.set(key, { height: cloneImageData(data.height), color: cloneImageData(data.color) });
                });
            }
            // For single clicks (not dragging), update modifiedTiles immediately
            if (!isDrawing) {
                setModifiedTiles(p => {
                    const m = new Map(p);
                    tiles.forEach(k => {
                        const e = m.get(k) ?? new Set<PaintMode>();
                        e.add(paintMode);
                        m.set(k, e);
                    });
                    return m;
                });
            }
        } else {
            // Non-commit mode: just preview
            tiles.forEach(key => preview.current.add(key));
        }

        applyView(tiles, tileData);
    }, [getActiveContext, getCtxs, restore, applyView, startX, startZ, tileSize, canvasSize, brushSize, brushShape, brushSoftness, brushHeight, brushColor, paintMode, isDrawing]);

    const clearPreview = useCallback(() => restore(), [restore]);

    const downloadModifiedTiles = useCallback(async () => {
        const queue: { key: string; type: string; data: ImageData }[] = [];
        modifiedTiles.forEach((types, key) => { const data = cache.current.get(key); if (!data) return; if (types.has("height")) queue.push({ key, type: "height", data: data.height }); if (types.has("color")) queue.push({ key, type: "color", data: data.color }); });
        for (let i = 0; i < queue.length; i++) { await downloadTile(queue[i].key, queue[i].type, queue[i].data, tileSize); if (i < queue.length - 1) await new Promise(resolve => setTimeout(resolve, 100)); }
    }, [modifiedTiles, tileSize]);

    const handleSetIsDrawing = useCallback((drawing: boolean) => {
        // When ending a stroke, finalize all modified tiles
        if (!drawing && strokeTiles.current.size > 0) {
            const mode = strokeMode.current;
            const tilesToUpdate = new Set(strokeTiles.current);

            // Update provider tiles with the final painted data
            tilesToUpdate.forEach(key => {
                const cachedData = cache.current.get(key);
                if (cachedData) {
                    const [tileX, tileZ] = parseTileKey(key);
                    updateProviderTile(tileX, tileZ, mode === "height" ? cachedData.height : undefined, mode === "color" ? cachedData.color : undefined);
                }
            });

            // Add all stroke tiles to modified tiles
            setModifiedTiles(previous => {
                const modified = new Map(previous);
                tilesToUpdate.forEach(key => {
                    const existingModes = modified.get(key) ?? new Set<PaintMode>();
                    existingModes.add(mode);
                    modified.set(key, existingModes);
                });
                return modified;
            });

            strokeTiles.current.clear();
        }

        if (!drawing) lastPos.current = null;
        setIsDrawing(drawing);
    }, [updateProviderTile]);

    // Refresh all tiles when paint mode changes to ensure correct textures are displayed
    useEffect(() => {
        if (!isLoaded || !tilesRef.current) return;
        const contexts = getCtxs();
        if (!contexts) return;

        const allTiles = new Set<string>();
        for (let z = startZ; z <= endZ; z++) {
            for (let x = startX; x <= endX; x++) {
                allTiles.add(`${x},${z}`);
            }
        }

        applyView(allTiles);
    }, [paintMode, isLoaded, getCtxs, applyView, startX, startZ, endX, endZ]);

    const value: MapEditorContextType = {
        paintMode, brushSize, brushShape, brushColor, brushHeight, brushSoftness, isDrawing, isLoaded, modifiedTiles,
        setPaintMode, setBrushSize, setBrushShape, setBrushColor, setBrushHeight, setBrushSoftness,
        setIsDrawing: handleSetIsDrawing, paintAt, clearPreview, downloadModifiedTiles, loadAllTiles, setCanvasRefs, setMapTilesRef,
        pointerRef,
    };

    return <MapEditorContext.Provider value={value}>{children}</MapEditorContext.Provider>;
}
