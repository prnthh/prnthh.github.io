"use client";

import { createContext, useContext, useRef, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import * as THREE from "three";
import { useMap } from "../MapProvider";
import { BrushMode, BrushSettings, CachedTileImages, EditorMode, PaintMode, PreviewColorTextureMap, PreviewHeightDataMap } from "./editorTypes";
import { blend, brushIntensity, buildHeightFieldFromImageData, disposeTextureMap, hexToRgb, imageToImageData, makeTexture, parseTileKey, solidImageData, tileToCanvas } from "./editorUtils";
import { useTerrainCanvasStore } from "./useTerrainCanvasStore";
import { useTerrainEditorTools } from "./useTerrainEditorTools";

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

interface MapEditorState {
    brush: BrushSettings;
    isDrawing: boolean;
    isLoaded: boolean;
    modifiedTiles: Map<string, Set<PaintMode>>;
    previewHeightDataMap: PreviewHeightDataMap;
    previewColorTextureMap: PreviewColorTextureMap;
    editorMode: EditorMode;
    brushMode: BrushMode;
}

interface MapEditorActions {
    setBrush: (settings: Partial<BrushSettings>) => void;
    setIsDrawing: (drawing: boolean) => void;
    paintAt: (x: number, y: number, commit: boolean) => void;
    clearPreview: () => void;
    generateRandomHeightmap: () => void;
    generateColormapFromHeightmap: () => void;
    downloadModifiedTiles: () => void;
    loadAllTiles: () => Promise<void>;
    reloadFromSource: () => Promise<void>;
    setCanvasRefs: (refs: { height: HTMLCanvasElement | null; color: HTMLCanvasElement | null }) => void;
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
    const [previewHeightDataMap, setPreviewHeightDataMap] = useState<PreviewHeightDataMap>(new Map());
    const [previewColorTextureMap, setPreviewColorTextureMap] = useState<PreviewColorTextureMap>(new Map());
    const [editorMode, setEditorMode] = useState<EditorMode>("edit");
    const [brushMode, setBrushMode] = useState<BrushMode>("move");

    const pointerRef = useRef<[number, number, number] | null>(null);
    const cache = useRef(new Map<string, { height: ImageData; color: ImageData }>());
    const preview = useRef(new Set<string>());
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const strokeTiles = useRef(new Set<string>());
    const strokeMode = useRef<PaintMode>("height");
    const previewColorTextureMapRef = useRef(previewColorTextureMap);
    const brushRef = useRef<BrushSettings>(brush);

    brushRef.current = brush;

    const handleTileLoaded = useCallback((key: string, images: CachedTileImages) => {
        cache.current.set(key, images);
    }, []);

    const resetModifiedState = useCallback(() => {
        preview.current.clear();
        strokeTiles.current.clear();
        lastPos.current = null;
        cache.current.clear();
        setModifiedTiles(new Map());
        setPreviewHeightDataMap(new Map());
        setPreviewColorTextureMap(prev => {
            disposeTextureMap(prev);
            return new Map();
        });
    }, []);

    const {
        getCanvasContexts,
        getActiveContext,
        setCanvasRefs,
    } = useTerrainCanvasStore({
        paintMode: brush.mode,
    });

    previewColorTextureMapRef.current = previewColorTextureMap;

    const captureTile = useCallback((key: string) => {
        const { height: hCtx, color: cCtx } = getCanvasContexts() ?? {};
        if (!hCtx || !cCtx) return;

        const [tileX, tileZ] = parseTileKey(key);
        const [canvasX, canvasZ] = tileToCanvas(tileX, tileZ, startX, startZ, tileSize);

        cache.current.set(key, {
            height: hCtx.getImageData(canvasX, canvasZ, tileSize, tileSize),
            color: cCtx.getImageData(canvasX, canvasZ, tileSize, tileSize)
        });
    }, [getCanvasContexts, startX, startZ, tileSize]);

    const applyView = useCallback((tiles: Set<string>) => {
        const contexts = getCanvasContexts();
        if (!contexts) return;
        const { height: hCtx, color: cCtx } = contexts;

        // Include neighbors for edge stitching
        const tilesToUpdate = new Set<string>(tiles);
        tiles.forEach(key => {
            const [x, z] = parseTileKey(key);
            [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]].forEach(([nx, nz]) =>
                tilesToUpdate.add(`${nx},${nz}`)
            );
        });

        const nextHeightEntries = new Map<string, Float32Array | null>();
        const nextColorEntries = new Map<string, THREE.Texture | null>();

        tilesToUpdate.forEach(key => {
            const [tileX, tileZ] = parseTileKey(key);
            const [canvasX, canvasZ] = tileToCanvas(tileX, tileZ, startX, startZ, tileSize);

            const height = hCtx.getImageData(canvasX, canvasZ, tileSize, tileSize);
            const heightField = buildHeightFieldFromImageData(height, tileSize);
            nextHeightEntries.set(key, heightField);

            const color = cCtx.getImageData(canvasX, canvasZ, tileSize, tileSize);
            const colorTexture = makeTexture(color, tileSize);
            nextColorEntries.set(key, colorTexture);
        });

        setPreviewHeightDataMap(prev => {
            const next = new Map(prev);
            nextHeightEntries.forEach((value, key) => next.set(key, value));
            return next;
        });
        setPreviewColorTextureMap(prev => {
            const next = new Map(prev);
            nextColorEntries.forEach((value, key) => {
                const previous = next.get(key);
                if (previous && previous !== value) previous.dispose();
                next.set(key, value);
            });
            return next;
        });
    }, [getCanvasContexts, startX, startZ, tileSize]);

    const syncTilesToProvider = useCallback((tiles: Set<string>, modes: PaintMode[]) => {
        const contexts = getCanvasContexts();
        if (!contexts || tiles.size === 0) return;
        const { height: hCtx, color: cCtx } = contexts;

        tiles.forEach(key => {
            const [tileX, tileZ] = parseTileKey(key);
            const [canvasX, canvasZ] = tileToCanvas(tileX, tileZ, startX, startZ, tileSize);
            const height = hCtx.getImageData(canvasX, canvasZ, tileSize, tileSize);
            const color = cCtx.getImageData(canvasX, canvasZ, tileSize, tileSize);

            cache.current.set(key, { height, color });

            updateProviderTile(
                tileX,
                tileZ,
                modes.includes("height") ? height : undefined,
                modes.includes("color") ? color : undefined
            );
        });

        setModifiedTiles(prev => {
            const updated = new Map(prev);
            tiles.forEach(key => {
                const current = updated.get(key) ?? new Set<PaintMode>();
                modes.forEach(mode => current.add(mode));
                updated.set(key, current);
            });
            return updated;
        });
    }, [getCanvasContexts, startX, startZ, tileSize, updateProviderTile]);

    const getAllTileKeys = useCallback(() => {
        const allTiles = new Set<string>();
        for (let z = startZ; z <= endZ; z++) {
            for (let x = startX; x <= endX; x++) {
                allTiles.add(`${x},${z}`);
            }
        }
        return allTiles;
    }, [startX, endX, startZ, endZ]);

    const refreshVisiblePreview = useCallback(() => {
        if (!isLoaded) return;
        applyView(getAllTileKeys());
    }, [isLoaded, applyView, getAllTileKeys]);

    const setBrush = useCallback((settings: Partial<BrushSettings>) => {
        const modeChanged = settings.mode !== undefined && settings.mode !== brushRef.current.mode;
        setBrushState(prev => ({ ...prev, ...settings }));
        if (modeChanged) {
            refreshVisiblePreview();
        }
    }, [refreshVisiblePreview]);

    const handleSetEditorMode = useCallback((mode: EditorMode) => {
        setEditorMode(mode);
        if (mode === "edit") return;

        setPreviewHeightDataMap(new Map());
        setPreviewColorTextureMap(prev => {
            disposeTextureMap(prev);
            return new Map();
        });
    }, []);

    const loadAllTiles = useCallback(async () => {
        if (!mapLoaded) return;
        const contexts = getCanvasContexts();
        if (!contexts) return;

        setIsLoaded(false);
        const allTiles = new Set<string>();
        const coords: Array<[number, number]> = [];
        for (let z = startZ; z <= endZ; z++) {
            for (let x = startX; x <= endX; x++) {
                coords.push([x, z]);
            }
        }

        const batchSize = 4;
        for (let i = 0; i < coords.length; i += batchSize) {
            const batch = coords.slice(i, i + batchSize);

            batch.forEach(([x, z]) => {
                const key = `${x},${z}`;
                allTiles.add(key);
                const images = getTileImages(x, z);
                const canvasX = (x - startX) * tileSize;
                const canvasZ = (z - startZ) * tileSize;
                contexts.height.putImageData(images.height, canvasX, canvasZ);
                contexts.color.putImageData(images.color, canvasX, canvasZ);
                handleTileLoaded(key, images);
            });

            await new Promise<void>((resolve) => {
                window.setTimeout(resolve, 0);
            });
        }

        if (!allTiles) return;
        setIsLoaded(true);
        applyView(allTiles);
    }, [mapLoaded, getCanvasContexts, startX, endX, startZ, endZ, tileSize, getTileImages, handleTileLoaded, applyView]);

    const reloadFromSource = useCallback(async () => {
        resetModifiedState();
        await loadAllTiles();
    }, [resetModifiedState, loadAllTiles]);

    const {
        generateRandomHeightmap,
        generateColormapFromHeightmap,
        downloadModifiedTiles,
    } = useTerrainEditorTools({
        canvasSize,
        tileSize,
        startX,
        endX,
        startZ,
        endZ,
        modifiedTiles,
        cacheRef: cache,
        getCanvasContexts,
        syncTilesToProvider,
        applyView,
    });

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

    const handleSetIsDrawing = useCallback((drawing: boolean) => {
        if (!drawing && strokeTiles.current.size > 0) {
            const mode = strokeMode.current;
            const tiles = new Set(strokeTiles.current);
            syncTilesToProvider(tiles, [mode]);
            strokeTiles.current.clear();
        }

        if (!drawing) lastPos.current = null;
        setIsDrawing(drawing);
    }, [syncTilesToProvider]);

    useEffect(() => {
        return () => {
            disposeTextureMap(previewColorTextureMapRef.current);
        };
    }, []);

    const value: MapEditorContextType = {
        brush,
        isDrawing,
        isLoaded,
        modifiedTiles,
        previewHeightDataMap,
        previewColorTextureMap,
        editorMode,
        brushMode,
        setBrush,
        setIsDrawing: handleSetIsDrawing,
        paintAt,
        clearPreview,
        generateRandomHeightmap,
        generateColormapFromHeightmap,
        downloadModifiedTiles,
        loadAllTiles,
        reloadFromSource,
        setCanvasRefs,
        setEditorMode: handleSetEditorMode,
        setBrushMode,
        pointerRef,
    };

    return <MapEditorContext.Provider value={value}>{children}</MapEditorContext.Provider>;
}
