"use client";

import { createContext, useContext, useRef, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import * as THREE from "three";
import { useMap, buildHeightFieldFromImageData, imageToImageData } from "../MapProvider";
import { MapTilesRef } from "../MapTile";

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

// Simple utilities
const parseTileKey = (key: string) => key.split(",").map(Number) as [number, number];
const tileToCanvas = (tileX: number, tileZ: number, startX: number, startZ: number, tileSize: number) =>
    [(tileX - startX) * tileSize, (tileZ - startZ) * tileSize] as const;

const solidImageData = (size: number, r: number, g: number, b: number) => {
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; }
    return typeof ImageData === 'undefined' ? { data, width: size, height: size } as ImageData : new ImageData(data, size, size);
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
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${x}_${z}_${type}.png`;
        a.click();
        setTimeout(resolve, 100);
    });
});

const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [255, 255, 255];
};

const brushIntensity = (dist: number, half: number, soft: number) => {
    if (soft <= 0) return 1;
    const ratio = dist / half;
    return ratio > 1 - soft ? 1 - Math.pow((ratio - (1 - soft)) / soft, 2) * (3 - 2 * ((ratio - (1 - soft)) / soft)) : 1;
};

const blend = (curr: number, target: number, intensity: number) => Math.round(curr + (target - curr) * intensity);

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
    const { isLoaded: mapLoaded, getTile, updateTile: updateProviderTile, gridConfig, tileChangeCount } = useMap();
    const { startX, endX, startZ, endZ, tileSizePx: tileSize, canvasSize } = gridConfig;

    const blankImage = useMemo(() => solidImageData(tileSize, 200, 200, 200), [tileSize]);

    const getTileImages = useCallback((tileX: number, tileZ: number) => {
        const tile = getTile(tileX, tileZ);
        const heightImg = tile.heightImage ? imageToImageData(tile.heightImage, tileSize) : null;
        const colorImg = tile.colormap?.image ? imageToImageData(tile.colormap.image as any, tileSize) : null;
        return {
            height: heightImg || blankImage,
            color: colorImg || blankImage
        };
    }, [getTile, tileSize, blankImage]);

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

    const pointerRef = useRef<[number, number, number] | null>(null);
    const hRef = useRef<HTMLCanvasElement | null>(null);
    const cRef = useRef<HTMLCanvasElement | null>(null);
    const tilesRef = useRef<MapTilesRef | null>(null);
    const cache = useRef(new Map<string, { height: ImageData; color: ImageData }>());
    const preview = useRef(new Set<string>());
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const strokeTiles = useRef(new Set<string>());
    const strokeMode = useRef<PaintMode>("height");

    const getActiveContext = () => (brush.mode === "height" ? hRef : cRef).current?.getContext("2d", { willReadFrequently: true }) ?? null;

    const captureTile = useCallback((key: string) => {
        const hCtx = hRef.current?.getContext("2d", { willReadFrequently: true });
        const cCtx = cRef.current?.getContext("2d", { willReadFrequently: true });
        if (!hCtx || !cCtx) return;

        const [tileX, tileZ] = parseTileKey(key);
        const [canvasX, canvasZ] = tileToCanvas(tileX, tileZ, startX, startZ, tileSize);

        cache.current.set(key, {
            height: hCtx.getImageData(canvasX, canvasZ, tileSize, tileSize),
            color: cCtx.getImageData(canvasX, canvasZ, tileSize, tileSize)
        });
    }, [startX, startZ, tileSize]);

    const setCanvasRefs = (refs: { height: HTMLCanvasElement | null; color: HTMLCanvasElement | null }) => {
        hRef.current = refs.height;
        cRef.current = refs.color;
    };

    const setMapTilesRef = (ref: MapTilesRef | null) => {
        tilesRef.current = ref;
    };

    const applyView = useCallback((tiles: Set<string>) => {
        if (!tilesRef.current) return;
        const hCtx = hRef.current?.getContext("2d", { willReadFrequently: true });
        const cCtx = cRef.current?.getContext("2d", { willReadFrequently: true });
        if (!hCtx || !cCtx) return;

        // Include neighbors for edge stitching
        const tilesToUpdate = new Set<string>(tiles);
        tiles.forEach(key => {
            const [x, z] = parseTileKey(key);
            [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]].forEach(([nx, nz]) =>
                tilesToUpdate.add(`${nx},${nz}`)
            );
        });

        tilesToUpdate.forEach(key => {
            const [tileX, tileZ] = parseTileKey(key);
            const [canvasX, canvasZ] = tileToCanvas(tileX, tileZ, startX, startZ, tileSize);

            const height = hCtx.getImageData(canvasX, canvasZ, tileSize, tileSize);
            const heightField = buildHeightFieldFromImageData(height, tileSize);
            tilesRef.current!.updateHeightData(key, heightField);

            const color = cCtx.getImageData(canvasX, canvasZ, tileSize, tileSize);
            const colorTexture = makeTexture(color, tileSize);
            if (colorTexture) tilesRef.current!.updateImageData(key, colorTexture);
        });
    }, [startX, startZ, tileSize]);

    const loadAllTiles = useCallback(async () => {
        if (!mapLoaded) return;
        const hCtx = hRef.current?.getContext("2d", { willReadFrequently: true });
        const cCtx = cRef.current?.getContext("2d", { willReadFrequently: true });
        if (!hCtx || !cCtx) return;

        setIsLoaded(false);
        const allTiles = new Set<string>();

        for (let z = startZ; z <= endZ; z++) {
            for (let x = startX; x <= endX; x++) {
                const key = `${x},${z}`;
                allTiles.add(key);
                const { height, color } = getTileImages(x, z);
                const [canvasX, canvasZ] = tileToCanvas(x, z, startX, startZ, tileSize);
                hCtx.putImageData(height, canvasX, canvasZ);
                cCtx.putImageData(color, canvasX, canvasZ);
                captureTile(key);
            }
        }

        setIsLoaded(true);
        applyView(allTiles);
    }, [mapLoaded, captureTile, applyView, startX, endX, startZ, endZ, tileSize, getTileImages]);

    const restore = useCallback(() => {
        if (preview.current.size === 0) return;
        const ctx = getActiveContext();
        if (!ctx) return;

        const tiles = new Set(preview.current);
        preview.current.clear();
        const imageType = brush.mode === "height" ? "height" : "color";

        tiles.forEach(key => {
            const original = cache.current.get(key)?.[imageType];
            if (!original) return;
            const [tileX, tileZ] = parseTileKey(key);
            const [canvasX, canvasZ] = tileToCanvas(tileX, tileZ, startX, startZ, tileSize);
            ctx.putImageData(original, canvasX, canvasZ);
        });

        applyView(tiles);
    }, [applyView, startX, startZ, tileSize, brush.mode]);

    const paintAt = useCallback((x: number, y: number, commit: boolean) => {
        const ctx = getActiveContext();
        if (!ctx || (commit && lastPos.current?.x === x && lastPos.current?.y === y)) return;

        if (commit) lastPos.current = { x, y };
        else restore();

        const half = Math.floor(brush.size / 2);
        const tiles = new Set<string>();
        const imgData = ctx.getImageData(0, 0, canvasSize, canvasSize);
        const isHeight = brush.mode === "height";
        const [r, g, b] = isHeight ? [brush.height, brush.height, brush.height] : hexToRgb(brush.color);

        for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
                const px = x + dx, py = y + dy;
                if (px < 0 || px >= canvasSize || py < 0 || py >= canvasSize) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);
                if (brush.shape === "circle" && dist > half) continue;

                tiles.add(`${Math.floor(px / tileSize) + startX},${Math.floor(py / tileSize) + startZ}`);

                const intensity = brushIntensity(dist, half, brush.softness);
                const i = (py * canvasSize + px) * 4;

                imgData.data[i] = blend(imgData.data[i], r, intensity);
                imgData.data[i + 1] = isHeight ? imgData.data[i] : blend(imgData.data[i + 1], g, intensity);
                imgData.data[i + 2] = isHeight ? imgData.data[i] : blend(imgData.data[i + 2], b, intensity);
                imgData.data[i + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);

        if (commit) {
            strokeMode.current = brush.mode;
            tiles.forEach(key => { strokeTiles.current.add(key); captureTile(key); });
            if (!isDrawing) {
                setModifiedTiles(prev => {
                    const updated = new Map(prev);
                    tiles.forEach(key => {
                        const modes = updated.get(key) ?? new Set<PaintMode>();
                        modes.add(brush.mode);
                        updated.set(key, modes);
                    });
                    return updated;
                });
            }
        } else {
            tiles.forEach(key => preview.current.add(key));
        }

        applyView(tiles);
    }, [restore, applyView, startX, startZ, tileSize, canvasSize, brush, isDrawing, captureTile]);

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
        if (!drawing && strokeTiles.current.size > 0) {
            const mode = strokeMode.current;
            const tiles = new Set(strokeTiles.current);

            tiles.forEach(key => {
                const cached = cache.current.get(key);
                if (!cached) return;
                const [tileX, tileZ] = parseTileKey(key);
                updateProviderTile(
                    tileX, tileZ,
                    mode === "height" ? cached.height : undefined,
                    mode === "color" ? cached.color : undefined
                );
            });

            setModifiedTiles(prev => {
                const updated = new Map(prev);
                tiles.forEach(key => {
                    const modes = updated.get(key) ?? new Set<PaintMode>();
                    modes.add(mode);
                    updated.set(key, modes);
                });
                return updated;
            });
            strokeTiles.current.clear();
        }

        if (!drawing) lastPos.current = null;
        setIsDrawing(drawing);
    }, [updateProviderTile]);

    useEffect(() => {
        if (!isLoaded || !tilesRef.current) return;
        const allTiles = new Set<string>();
        for (let z = startZ; z <= endZ; z++) {
            for (let x = startX; x <= endX; x++) allTiles.add(`${x},${z}`);
        }
        applyView(allTiles);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brush.mode, isLoaded]);

    // Reload all tiles when MapProvider tiles change (e.g., image loaded)
    useEffect(() => {
        if (mapLoaded && isLoaded) {
            loadAllTiles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tileChangeCount]);

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
