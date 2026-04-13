"use client";

import { MutableRefObject, useCallback } from "react";
import { CachedTileImages, PaintMode } from "./editorTypes";
import { TerrainCanvasContexts } from "./useTerrainCanvasStore";

type SaveFilePickerWindow = Window & {
    showDirectoryPicker?: () => Promise<{
        getFileHandle: (name: string, options?: { create?: boolean }) => Promise<{
            createWritable: () => Promise<{
                write: (data: Blob) => Promise<void>;
                close: () => Promise<void>;
            }>;
        }>;
    }>;
    showSaveFilePicker?: (options?: {
        suggestedName?: string;
        types?: Array<{
            description?: string;
            accept: Record<string, string[]>;
        }>;
    }) => Promise<{
        createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
        }>;
    }>;
};

const hashNoise = (x: number, y: number, seed: number) => {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
    return value - Math.floor(value);
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);

const valueNoise = (x: number, y: number, scale: number, seed: number) => {
    const scaledX = x / scale;
    const scaledY = y / scale;
    const x0 = Math.floor(scaledX);
    const y0 = Math.floor(scaledY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const tx = smoothstep(scaledX - x0);
    const ty = smoothstep(scaledY - y0);

    const n00 = hashNoise(x0, y0, seed);
    const n10 = hashNoise(x1, y0, seed);
    const n01 = hashNoise(x0, y1, seed);
    const n11 = hashNoise(x1, y1, seed);

    const top = n00 * (1 - tx) + n10 * tx;
    const bottom = n01 * (1 - tx) + n11 * tx;
    return top * (1 - ty) + bottom * ty;
};

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const randomInRange = (min: number, max: number) => lerp(min, max, Math.random());

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const terrainBandFromHeight = (height: number) => {
    if (height < 92) return 3;
    if (height < 170) return 1;
    return 2;
};

const downloadTile = (key: string, type: string, data: ImageData, size: number) => new Promise<void>((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve();
    ctx.putImageData(data, 0, 0);
    canvas.toBlob(blob => {
        if (!blob) return resolve();
        const [x, z] = key.split(",").map(Number);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${x}_${z}_${type}.png`;
        a.click();
        setTimeout(resolve, 100);
    });
});

const imageDataToBlob = (data: ImageData, size: number) => new Promise<Blob | null>((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve(null);
    ctx.putImageData(data, 0, 0);
    canvas.toBlob(resolve, "image/png");
});

const writeBlobWithSavePrompt = async (fileName: string, blob: Blob, directoryHandle?: Awaited<ReturnType<NonNullable<SaveFilePickerWindow["showDirectoryPicker"]>>>) => {
    if (directoryHandle) {
        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
    }

    const pickerWindow = window as SaveFilePickerWindow;
    if (pickerWindow.showSaveFilePicker) {
        const fileHandle = await pickerWindow.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: "PNG Image", accept: { "image/png": [".png"] } }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
    }

    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
};

type UseTerrainEditorToolsParams = {
    canvasSize: number;
    tileSize: number;
    startX: number;
    endX: number;
    startZ: number;
    endZ: number;
    modifiedTiles: Map<string, Set<PaintMode>>;
    cacheRef: MutableRefObject<Map<string, CachedTileImages>>;
    getCanvasContexts: () => TerrainCanvasContexts | null;
    syncTilesToProvider: (tiles: Set<string>, modes: PaintMode[]) => void;
    applyView: (tiles: Set<string>) => void;
};

export function useTerrainEditorTools({
    canvasSize,
    tileSize,
    startX,
    endX,
    startZ,
    endZ,
    modifiedTiles,
    cacheRef,
    getCanvasContexts,
    syncTilesToProvider,
    applyView,
}: UseTerrainEditorToolsParams) {
    const getAllTileKeys = useCallback(() => {
        const keys = new Set<string>();
        for (let z = startZ; z <= endZ; z++) {
            for (let x = startX; x <= endX; x++) {
                keys.add(`${x},${z}`);
            }
        }
        return keys;
    }, [startX, endX, startZ, endZ]);

    const generateRandomHeightmap = useCallback(() => {
        const contexts = getCanvasContexts();
        if (!contexts) return;
        const { height: hCtx } = contexts;

        const seed = Math.random() * 1000;
        const largeScale = randomInRange(120, 280);
        const mediumScale = randomInRange(48, 132);
        const detailScale = randomInRange(10, 42);
        const largeWeight = randomInRange(0.35, 0.7);
        const mediumWeight = randomInRange(0.15, 0.4);
        const detailWeight = randomInRange(0.05, 0.22);
        const weightTotal = largeWeight + mediumWeight + detailWeight;
        const normalizedLargeWeight = largeWeight / weightTotal;
        const normalizedMediumWeight = mediumWeight / weightTotal;
        const normalizedDetailWeight = detailWeight / weightTotal;
        const heightFloor = randomInRange(0, 60);
        const heightCeiling = randomInRange(205, 255);
        const contrast = randomInRange(0.85, 1.8);
        const falloffStrength = randomInRange(0, 110);
        const falloffRadius = randomInRange(0.85, 1.85);
        const imageData = hCtx.createImageData(canvasSize, canvasSize);

        for (let y = 0; y < canvasSize; y++) {
            for (let x = 0; x < canvasSize; x++) {
                const large = valueNoise(x, y, largeScale, seed);
                const medium = valueNoise(x, y, mediumScale, seed + 11.7);
                const detail = valueNoise(x, y, detailScale, seed + 29.4);
                const radialX = x / Math.max(1, canvasSize - 1) - 0.5;
                const radialY = y / Math.max(1, canvasSize - 1) - 0.5;
                const distance = Math.sqrt(radialX * radialX + radialY * radialY);
                const falloff = Math.max(0, 1 - distance * falloffRadius);
                const blendedNoise =
                    large * normalizedLargeWeight +
                    medium * normalizedMediumWeight +
                    detail * normalizedDetailWeight;
                const contrastedNoise = Math.pow(blendedNoise, contrast);
                const height = clampByte(lerp(heightFloor, heightCeiling, contrastedNoise) + falloff * falloffStrength);
                const index = (y * canvasSize + x) * 4;
                imageData.data[index] = height;
                imageData.data[index + 1] = height;
                imageData.data[index + 2] = height;
                imageData.data[index + 3] = 255;
            }
        }

        hCtx.putImageData(imageData, 0, 0);

        const allTiles = getAllTileKeys();
        syncTilesToProvider(allTiles, ["height"]);
        applyView(allTiles);
    }, [getCanvasContexts, canvasSize, getAllTileKeys, syncTilesToProvider, applyView]);

    const generateColormapFromHeightmap = useCallback(() => {
        const contexts = getCanvasContexts();
        if (!contexts) return;
        const { height: hCtx, color: cCtx } = contexts;

        const heightData = hCtx.getImageData(0, 0, canvasSize, canvasSize);
        const colorData = cCtx.createImageData(canvasSize, canvasSize);

        for (let i = 0; i < heightData.data.length; i += 4) {
            const terrainBand = terrainBandFromHeight(heightData.data[i]);
            colorData.data[i] = terrainBand;
            colorData.data[i + 1] = 0;
            colorData.data[i + 2] = 0;
            colorData.data[i + 3] = 255;
        }

        cCtx.putImageData(colorData, 0, 0);

        const allTiles = getAllTileKeys();
        syncTilesToProvider(allTiles, ["color"]);
        applyView(allTiles);
    }, [getCanvasContexts, canvasSize, getAllTileKeys, syncTilesToProvider, applyView]);

    const downloadModifiedTiles = useCallback(async () => {
        const queue: { key: string; type: string; data: ImageData }[] = [];
        const pickerWindow = window as SaveFilePickerWindow;
        const shouldUseDirectory = queue.length !== 1 && !!pickerWindow.showDirectoryPicker;

        modifiedTiles.forEach((types, key) => {
            const data = cacheRef.current.get(key);
            if (!data) return;
            if (types.has("height")) queue.push({ key, type: "height", data: data.height });
            if (types.has("color")) queue.push({ key, type: "color", data: data.color });
        });

        let directoryHandle: Awaited<ReturnType<NonNullable<SaveFilePickerWindow["showDirectoryPicker"]>>> | undefined;
        if (queue.length > 1 && pickerWindow.showDirectoryPicker) {
            try {
                directoryHandle = await pickerWindow.showDirectoryPicker();
            } catch {
                return;
            }
        }

        for (let i = 0; i < queue.length; i++) {
            const [x, z] = queue[i].key.split(",").map(Number);
            const fileName = `${x}_${z}_${queue[i].type}.png`;
            const blob = await imageDataToBlob(queue[i].data, tileSize);
            if (!blob) continue;

            try {
                await writeBlobWithSavePrompt(fileName, blob, directoryHandle);
            } catch {
                if (!directoryHandle) {
                    await downloadTile(queue[i].key, queue[i].type, queue[i].data, tileSize);
                }
                return;
            }

            if (i < queue.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }, [modifiedTiles, cacheRef, tileSize]);

    return {
        generateRandomHeightmap,
        generateColormapFromHeightmap,
        downloadModifiedTiles,
    };
}