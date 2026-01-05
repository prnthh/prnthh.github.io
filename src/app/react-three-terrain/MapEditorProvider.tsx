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
    const data = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < data.length; i += 4) {
        data.set([red, green, blue, 255], i);
    }

    if (typeof ImageData === 'undefined') {
        return { data, width: size, height: size } as ImageData;
    }
    return new ImageData(data, size, size);
};

const createCanvasWithImageData = (data: ImageData, size: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(data, 0, 0);
    return canvas;
};

const makeTexture = (data: ImageData, size: number) => {
    const canvas = createCanvasWithImageData(data, size);
    if (!canvas) return null;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
};

const downloadTile = (key: string, type: string, data: ImageData, size: number) => new Promise<void>(resolve => {
    const canvas = createCanvasWithImageData(data, size);
    if (!canvas) return resolve();

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

const intensity = (dist: number, half: number, soft: number) =>
    soft <= 0 ? 1 : (dist / half > 1 - soft ? 1 - ((dist / half - (1 - soft)) / soft) ** 2 * (3 - 2 * ((dist / half - (1 - soft)) / soft)) : 1);

const getTileNeighbors = (tileX: number, tileZ: number) => [
    [tileX + 1, tileZ], [tileX - 1, tileZ], [tileX, tileZ + 1], [tileX, tileZ - 1]
].map(([x, z]) => `${x},${z}`);

const blendPixelChannel = (current: number, target: number, intensity: number) =>
    Math.round(current + (target - current) * intensity);

const getAllTileKeys = (startX: number, endX: number, startZ: number, endZ: number) => {
    const tiles = new Set<string>();
    for (let z = startZ; z <= endZ; z++) {
        for (let x = startX; x <= endX; x++) {
            tiles.add(`${x},${z}`);
        }
    }
    return tiles;
};

const addTilesToModified = (
    modifiedTiles: Map<string, Set<PaintMode>>,
    tilesToAdd: Set<string>,
    mode: PaintMode
) => {
    const updated = new Map(modifiedTiles);
    tilesToAdd.forEach(key => {
        const existingModes = updated.get(key) ?? new Set<PaintMode>();
        existingModes.add(mode);
        updated.set(key, existingModes);
    });
    return updated;
};

type PaintMode = "height" | "color";
type BrushShape = "circle" | "square";
type EditorMode = "play" | "edit";
type BrushMode = "brush" | "move";

interface BrushSettings {
    mode: PaintMode;
    size: number;
    shape: BrushShape;
    color: string;
    height: number;
    softness: number;
}

interface MapEditorState {
    brush: BrushSettings;
    isDrawing: boolean;
    isLoaded: boolean;
    modifiedTiles: Map<string, Set<PaintMode>>;
    editorMode: EditorMode;
    brushMode: BrushMode;
}

interface MapEditorActions {
    setBrush: (settings: Partial<BrushSettings>) => void;
    setIsDrawing: (drawing: boolean) => void;
    paintAt: (x: number, y: number, commit: boolean) => void;
    clearPreview: () => void;
    downloadModifiedTiles: () => void;
    loadAllTiles: () => Promise<void>;
    setCanvasRefs: (refs: { height: HTMLCanvasElement | null; color: HTMLCanvasElement | null }) => void;
    setMapTilesRef: (ref: MapTilesRef | null) => void;
    pointerRef: React.MutableRefObject<[number, number, number] | null>;
    setEditorMode: (mode: EditorMode) => void;
    setBrushMode: (mode: BrushMode) => void;
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

    // Create blank fallback image once per tileSize change (shared for both height and color)
    const blankImage = useMemo(() => solidImageData(tileSize, 200, 200, 200), [tileSize]);

    const getTileImages = (tileX: number, tileZ: number) => {
        const tile = getTile(tileX, tileZ);

        const extractImageData = (source: any) => {
            if (!source) return blankImage;
            return imageToImageData(source, tileSize) || blankImage;
        };

        return {
            height: extractImageData(tile?.heightImage),
            color: extractImageData(tile?.colormap?.image)
        };
    };

    const [brush, setBrushState] = useState<BrushSettings>({
        mode: "color",
        size: 10,
        shape: "circle",
        color: "#ffffff",
        height: 128,
        softness: 0
    });
    const [isDrawing, setIsDrawing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [modifiedTiles, setModifiedTiles] = useState<Map<string, Set<PaintMode>>>(new Map());
    const [editorMode, setEditorMode] = useState<EditorMode>("edit");
    const [brushMode, setBrushMode] = useState<BrushMode>("move");

    const setBrush = useCallback((settings: Partial<BrushSettings>) => {
        setBrushState(prev => ({ ...prev, ...settings }));
    }, []);

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

    // Helper to get both canvas contexts
    const getCtxs = () => {
        const heightCtx = hRef.current?.getContext("2d", { willReadFrequently: true });
        const colorCtx = cRef.current?.getContext("2d", { willReadFrequently: true });
        return heightCtx && colorCtx ? { height: heightCtx, color: colorCtx } : null;
    };

    const getActiveContext = () => (brush.mode === "height" ? hRef : cRef).current?.getContext("2d", { willReadFrequently: true }) ?? null;

    // Extract ImageData for a specific tile from both canvases
    const extractTileData = useCallback((key: string, heightCtx: CanvasRenderingContext2D, colorCtx: CanvasRenderingContext2D) => {
        const [tileX, tileZ] = parseTileKey(key);
        const { canvasX, canvasZ } = canvasCoords(tileX, tileZ, startX, startZ, tileSize);
        return {
            height: heightCtx.getImageData(canvasX, canvasZ, tileSize, tileSize),
            color: colorCtx.getImageData(canvasX, canvasZ, tileSize, tileSize)
        };
    }, [startX, startZ, tileSize]);

    const capture = useCallback((key: string, heightCtx: CanvasRenderingContext2D, colorCtx: CanvasRenderingContext2D) => {
        const data = extractTileData(key, heightCtx, colorCtx);
        cache.current.set(key, {
            height: cloneImageData(data.height),
            color: cloneImageData(data.color)
        });
    }, [extractTileData]);

    // Simple ref setters - no need for useCallback
    const setCanvasRefs = (refs: { height: HTMLCanvasElement | null; color: HTMLCanvasElement | null }) => {
        hRef.current = refs.height;
        cRef.current = refs.color;
    };

    const setMapTilesRef = (ref: MapTilesRef | null) => {
        tilesRef.current = ref;
    };

    const applyView = useCallback((tiles: Set<string>, tileData?: Map<string, { height: ImageData; color: ImageData }>) => {
        if (!tilesRef.current) return;
        const contexts = getCtxs(); if (!contexts) return;

        // Collect all tiles that need updating (including neighbors for edge stitching)
        const tilesToUpdate = new Set<string>(tiles);

        // Update all 4 neighbors of each modified tile
        // This ensures edge stitching works properly in both directions
        tiles.forEach(key => {
            const [tileX, tileZ] = parseTileKey(key);
            getTileNeighbors(tileX, tileZ).forEach(neighbor => tilesToUpdate.add(neighbor));
        });

        tilesToUpdate.forEach(key => {
            // Use provided data or read from canvas
            const data = tileData?.get(key) ?? extractTileData(key, contexts.height, contexts.color);

            const heightField = buildHeightFieldFromImageData(data.height, tileSize);
            tilesRef.current!.updateHeightData(key, heightField);

            const colorTexture = makeTexture(data.color, tileSize);
            if (colorTexture) tilesRef.current!.updateImageData(key, colorTexture);
        });
    }, [startX, startZ, tileSize, extractTileData]);

    const loadAllTiles = useCallback(async () => {
        if (!mapLoaded) return;
        const contexts = getCtxs();
        if (!contexts) return;

        setIsLoaded(false);
        const allTiles = getAllTileKeys(startX, endX, startZ, endZ);

        allTiles.forEach(key => {
            const [x, z] = parseTileKey(key);
            const { height, color } = getTileImages(x, z);
            const { canvasX, canvasZ } = canvasCoords(x, z, startX, startZ, tileSize);

            contexts.height.putImageData(height, canvasX, canvasZ);
            contexts.color.putImageData(color, canvasX, canvasZ);
            capture(key, contexts.height, contexts.color);
        });

        setIsLoaded(true);
        applyView(allTiles);
    }, [mapLoaded, capture, applyView, startX, endX, startZ, endZ, tileSize]);

    const restore = useCallback(() => {
        if (preview.current.size === 0) return;
        const activeContext = getActiveContext();
        if (!activeContext) return;

        const tiles = new Set(preview.current);
        preview.current.clear();

        const imageType = brush.mode === "height" ? "height" : "color";
        tiles.forEach(key => {
            const original = cache.current.get(key);
            if (!original) return;

            const [tileX, tileZ] = parseTileKey(key);
            const { canvasX, canvasZ } = canvasCoords(tileX, tileZ, startX, startZ, tileSize);
            activeContext.putImageData(original[imageType], canvasX, canvasZ);
        });

        applyView(tiles);
    }, [applyView, startX, startZ, tileSize, brush.mode]);

    const paintAt = useCallback((x: number, y: number, commit: boolean) => {
        const activeContext = getActiveContext();
        if (!activeContext) return;
        if (commit && lastPos.current?.x === x && lastPos.current?.y === y) return;

        if (commit) {
            lastPos.current = { x, y };
        } else {
            restore();
        }

        const halfSize = Math.floor(brush.size / 2);
        const tiles = new Set<string>();
        const imageData = activeContext.getImageData(0, 0, canvasSize, canvasSize);

        for (let dy = -halfSize; dy <= halfSize; dy++) {
            for (let dx = -halfSize; dx <= halfSize; dx++) {
                const pixelX = x + dx;
                const pixelY = y + dy;
                if (pixelX < 0 || pixelX >= canvasSize || pixelY < 0 || pixelY >= canvasSize) continue;

                const distance = Math.sqrt(dx * dx + dy * dy);
                if (brush.shape === "circle" && distance > halfSize) continue;

                tiles.add(`${Math.floor(pixelX / tileSize) + startX},${Math.floor(pixelY / tileSize) + startZ}`);

                const intensityValue = intensity(distance, halfSize, brush.softness);
                const index = (pixelY * canvasSize + pixelX) * 4;

                if (brush.mode === "height") {
                    const newHeight = blendPixelChannel(imageData.data[index], brush.height, intensityValue);
                    imageData.data[index] = newHeight;
                    imageData.data[index + 1] = newHeight;
                    imageData.data[index + 2] = newHeight;
                } else {
                    const rgb = hexToRgb(brush.color);
                    imageData.data[index] = blendPixelChannel(imageData.data[index], rgb.r, intensityValue);
                    imageData.data[index + 1] = blendPixelChannel(imageData.data[index + 1], rgb.g, intensityValue);
                    imageData.data[index + 2] = blendPixelChannel(imageData.data[index + 2], rgb.b, intensityValue);
                }
                imageData.data[index + 3] = 255;
            }
        }
        activeContext.putImageData(imageData, 0, 0);

        // Extract tile data once for applyView
        const contexts = getCtxs();
        if (!contexts) return;

        const tileData = new Map<string, { height: ImageData; color: ImageData }>();
        tiles.forEach(key => {
            tileData.set(key, extractTileData(key, contexts.height, contexts.color));
        });

        if (commit) {
            strokeMode.current = brush.mode;
            tiles.forEach(key => {
                strokeTiles.current.add(key);
                const data = tileData.get(key);
                if (data) cache.current.set(key, { height: cloneImageData(data.height), color: cloneImageData(data.color) });
            });
            // For single clicks (not dragging), update modifiedTiles immediately
            if (!isDrawing) {
                setModifiedTiles(prev => addTilesToModified(prev, tiles, brush.mode));
            }
        } else {
            // Non-commit mode: just preview
            tiles.forEach(key => preview.current.add(key));
        }

        applyView(tiles, tileData);
    }, [restore, applyView, startX, startZ, tileSize, canvasSize, brush, isDrawing, extractTileData]);

    const clearPreview = useCallback(() => restore(), [restore]);

    const downloadModifiedTiles = useCallback(async () => {
        const queue: { key: string; type: string; data: ImageData }[] = [];

        modifiedTiles.forEach((types, key) => {
            const data = cache.current.get(key);
            if (!data) return;
            if (types.has("height")) queue.push({ key, type: "height", data: data.height });
            if (types.has("color")) queue.push({ key, type: "color", data: data.color });
        });

        for (let i = 0; i < queue.length; i++) {
            await downloadTile(queue[i].key, queue[i].type, queue[i].data, tileSize);
            if (i < queue.length - 1) await new Promise(resolve => setTimeout(resolve, 100));
        }
    }, [modifiedTiles, tileSize]);

    const handleSetIsDrawing = useCallback((drawing: boolean) => {
        // When ending a stroke, finalize all modified tiles
        if (!drawing && strokeTiles.current.size > 0) {
            const mode = strokeMode.current;
            const tilesToUpdate = new Set(strokeTiles.current);

            // Update provider tiles with final painted data and add to modified tiles
            tilesToUpdate.forEach(key => {
                const cachedData = cache.current.get(key);
                if (!cachedData) return;

                const [tileX, tileZ] = parseTileKey(key);
                const heightData = mode === "height" ? cachedData.height : undefined;
                const colorData = mode === "color" ? cachedData.color : undefined;
                updateProviderTile(tileX, tileZ, heightData, colorData);
            });

            setModifiedTiles(prev => addTilesToModified(prev, tilesToUpdate, mode));
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

        const allTiles = getAllTileKeys(startX, endX, startZ, endZ);
        applyView(allTiles);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brush.mode, isLoaded, applyView, startX, startZ, endX, endZ]);

    const value: MapEditorContextType = {
        brush,
        isDrawing,
        isLoaded,
        modifiedTiles,
        editorMode,
        brushMode,
        setBrush,
        setIsDrawing: handleSetIsDrawing,
        paintAt,
        clearPreview,
        downloadModifiedTiles,
        loadAllTiles,
        setCanvasRefs,
        setMapTilesRef,
        setEditorMode,
        setBrushMode,
        pointerRef,
    };

    return <MapEditorContext.Provider value={value}>{children}</MapEditorContext.Provider>;
}
