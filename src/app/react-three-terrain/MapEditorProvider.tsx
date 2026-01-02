"use client";

import { createContext, useContext, useRef, useState, useCallback, ReactNode } from "react";
import * as THREE from "three";
import { useMap } from "./MapProvider";
import { MapTilesRef } from "./MapTile";

const RES = 32, SCALE = 20;
const clone = (d: ImageData) => new ImageData(new Uint8ClampedArray(d.data), d.width, d.height);
const parseKey = (k: string) => k.split(",").map(Number) as [number, number];
const canvasCoords = (tx: number, tz: number, sx: number, sz: number, ts: number) => ({ canvasX: (tx - sx) * ts, canvasZ: (tz - sz) * ts });

const mkTexture = (data: ImageData, size: number) => {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const ctx = c.getContext("2d"); if (!ctx) return null;
    ctx.putImageData(data, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
    return tex;
};

const downloadTile = (key: string, type: string, data: ImageData, size: number) => new Promise<void>(r => {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const ctx = c.getContext("2d"); if (!ctx) return r();
    ctx.putImageData(data, 0, 0);
    c.toBlob(b => { if (!b) return r(); const [x, z] = parseKey(key); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${x}_${z}_${type}.png`; a.click(); setTimeout(r, 100); });
});

const hex2rgb = (h: string) => { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 255, g: 255, b: 255 }; };

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
    const { isLoaded: mapLoaded, getTileImages, updateTile: updateProviderTile, gridConfig } = useMap();
    const { startX: SX, endX: EX, startZ: SZ, endZ: EZ, tileSizePx: TS, canvasSize: CS } = gridConfig;

    const [paintMode, setPaintMode] = useState<PaintMode>("height");
    const [brushSize, setBrushSize] = useState(10);
    const [brushShape, setBrushShape] = useState<BrushShape>("circle");
    const [brushColor, setBrushColor] = useState("#ffffff");
    const [brushHeight, setBrushHeight] = useState(128);
    const [brushSoftness, setBrushSoftness] = useState(0);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [modifiedTiles, setModifiedTiles] = useState<Map<string, Set<PaintMode>>>(new Map());

    const pointerRef = useRef<[number, number, number] | null>(null);
    const hRef = useRef<HTMLCanvasElement | null>(null), cRef = useRef<HTMLCanvasElement | null>(null);
    const tilesRef = useRef<MapTilesRef | null>(null);
    const cache = useRef(new Map<string, { height: ImageData; color: ImageData }>());
    const strokeTiles = useRef(new Set<string>()), strokeMode = useRef<PaintMode>("height");
    const preview = useRef(new Set<string>()), lastPos = useRef<{ x: number; y: number } | null>(null);
    const modeRef = useRef(paintMode); modeRef.current = paintMode;
    const sizeRef = useRef(brushSize); sizeRef.current = brushSize;
    const shapeRef = useRef(brushShape); shapeRef.current = brushShape;
    const colorRef = useRef(brushColor); colorRef.current = brushColor;
    const heightRef = useRef(brushHeight); heightRef.current = brushHeight;
    const softRef = useRef(brushSoftness); softRef.current = brushSoftness;
    const drawRef = useRef(isDrawing); drawRef.current = isDrawing;

    const getCtxs = useCallback(() => {
        const h = hRef.current?.getContext("2d", { willReadFrequently: true }), c = cRef.current?.getContext("2d", { willReadFrequently: true });
        return h && c ? { height: h, color: c } : null;
    }, []);
    const getActive = useCallback(() => (modeRef.current === "height" ? hRef : cRef).current?.getContext("2d", { willReadFrequently: true }) ?? null, []);
    const capture = useCallback((k: string, h: CanvasRenderingContext2D, c: CanvasRenderingContext2D) => {
        const [tx, tz] = parseKey(k), { canvasX: cx, canvasZ: cz } = canvasCoords(tx, tz, SX, SZ, TS);
        cache.current.set(k, { height: clone(h.getImageData(cx, cz, TS, TS)), color: clone(c.getImageData(cx, cz, TS, TS)) });
    }, [SX, SZ, TS]);
    const setCanvasRefs = useCallback((refs: { height: HTMLCanvasElement | null; color: HTMLCanvasElement | null }) => { hRef.current = refs.height; cRef.current = refs.color; }, []);
    const setMapTilesRef = useCallback((ref: MapTilesRef | null) => { tilesRef.current = ref; }, []);
    const intensity = (dist: number, half: number, soft: number) => soft <= 0 ? 1 : (dist / half > 1 - soft ? 1 - ((dist / half - (1 - soft)) / soft) ** 2 * (3 - 2 * ((dist / half - (1 - soft)) / soft)) : 1);

    const applyView = useCallback((tiles: Set<string>) => {
        if (!tilesRef.current) return; const ctxs = getCtxs(); if (!ctxs) return;
        tiles.forEach(k => {
            const [tx, tz] = parseKey(k), { canvasX: cx, canvasZ: cz } = canvasCoords(tx, tz, SX, SZ, TS);
            const hd = ctxs.height.getImageData(cx, cz, TS, TS), gS = RES + 1, hf = new Float32Array(gS * gS);
            for (let gz = 0; gz < gS; gz++) for (let gx = 0; gx < gS; gx++) {
                const sx = Math.floor((gx / RES) * (TS - 1)), sz = Math.floor((gz / RES) * (TS - 1));
                hf[gz * gS + gx] = (hd.data[(sz * TS + sx) * 4] / 255) * SCALE;
            }
            tilesRef.current!.updateHeightData(k, hf);
            const cd = ctxs.color.getImageData(cx, cz, TS, TS);
            const ht = mkTexture(hd, TS), ct = mkTexture(cd, TS);
            if (ct) tilesRef.current!.updateImageData(k, ct, "color");
            if (ht) tilesRef.current!.updateImageData(k, ht, "height");
        });
    }, [getCtxs, SX, SZ, TS]);

    const loadAllTiles = useCallback(async () => {
        if (!mapLoaded) return; const ctxs = getCtxs(); if (!ctxs) return; setIsLoaded(false);
        const all = new Set<string>();
        for (let z = SZ; z <= EZ; z++) for (let x = SX; x <= EX; x++) {
            const { height, color } = getTileImages(x, z), cx = (x - SX) * TS, cz = (z - SZ) * TS;
            ctxs.height.putImageData(height, cx, cz); ctxs.color.putImageData(color, cx, cz);
            capture(`${x},${z}`, ctxs.height, ctxs.color); all.add(`${x},${z}`);
        }
        setIsLoaded(true); applyView(all);
    }, [mapLoaded, getTileImages, getCtxs, capture, applyView, SX, EX, SZ, EZ, TS]);

    const restore = useCallback(() => {
        if (preview.current.size === 0) return; const ctx = getActive(); if (!ctx) return;
        const tiles = new Set(preview.current); preview.current.clear();
        tiles.forEach(k => {
            const orig = cache.current.get(k); if (!orig) return;
            const [tx, tz] = parseKey(k), cx = (tx - SX) * TS, cz = (tz - SZ) * TS;
            ctx.putImageData(modeRef.current === "height" ? orig.height : orig.color, cx, cz);
        });
        applyView(tiles);
    }, [getActive, applyView, SX, SZ, TS]);

    const paintAt = useCallback((x: number, y: number, commit: boolean) => {
        const ctx = getActive(); if (!ctx) return;
        if (commit && lastPos.current?.x === x && lastPos.current?.y === y) return;
        if (commit) lastPos.current = { x, y }; if (!commit) restore();

        const brush = sizeRef.current, half = Math.floor(brush / 2), shape = shapeRef.current, soft = softRef.current;
        const tiles = new Set<string>(), img = ctx.getImageData(0, 0, CS, CS);
        const mode = modeRef.current, ht = heightRef.current, clr = colorRef.current;

        for (let dy = -half; dy <= half; dy++) for (let dx = -half; dx <= half; dx++) {
            const px = x + dx, py = y + dy;
            if (px < 0 || px >= CS || py < 0 || py >= CS) continue;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (shape === "circle" && dist > half) continue;
            tiles.add(`${Math.floor(px / TS) + SX},${Math.floor(py / TS) + SZ}`);
            const int = intensity(dist, half, soft), idx = (py * CS + px) * 4;
            if (mode === "height") {
                const h = Math.round(img.data[idx] + (ht - img.data[idx]) * int);
                img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = h; img.data[idx + 3] = 255;
            } else {
                const rgb = hex2rgb(clr);
                img.data[idx] = Math.round(img.data[idx] + (rgb.r - img.data[idx]) * int);
                img.data[idx + 1] = Math.round(img.data[idx + 1] + (rgb.g - img.data[idx + 1]) * int);
                img.data[idx + 2] = Math.round(img.data[idx + 2] + (rgb.b - img.data[idx + 2]) * int);
                img.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        if (commit) {
            const ctxs = getCtxs(); if (ctxs) {
                strokeMode.current = mode;
                tiles.forEach(k => {
                    strokeTiles.current.add(k); capture(k, ctxs.height, ctxs.color);
                });
            }
            if (!drawRef.current) setModifiedTiles(p => { const m = new Map(p); tiles.forEach(k => { const e = m.get(k) ?? new Set<PaintMode>(); e.add(mode); m.set(k, e); }); return m; });
        } else tiles.forEach(k => preview.current.add(k));
        applyView(tiles);
    }, [getActive, getCtxs, restore, applyView, capture, SX, SZ, TS, CS]);

    const clearPreview = useCallback(() => restore(), [restore]);

    const downloadModifiedTiles = useCallback(async () => {
        const q: { k: string; t: string; d: ImageData }[] = [];
        modifiedTiles.forEach((types, k) => { const d = cache.current.get(k); if (!d) return; if (types.has("height")) q.push({ k, t: "height", d: d.height }); if (types.has("color")) q.push({ k, t: "color", d: d.color }); });
        for (let i = 0; i < q.length; i++) { await downloadTile(q[i].k, q[i].t, q[i].d, TS); if (i < q.length - 1) await new Promise(r => setTimeout(r, 100)); }
    }, [modifiedTiles, TS]);

    const handleSetIsDrawing = useCallback((d: boolean) => {
        if (!d && strokeTiles.current.size > 0) {
            const mode = strokeMode.current;
            // Update provider tiles in batch after stroke completes
            strokeTiles.current.forEach(k => {
                const c = cache.current.get(k);
                if (c) {
                    const [tx, tz] = parseKey(k);
                    updateProviderTile(tx, tz, mode === "height" ? c.height : undefined, mode === "color" ? c.color : undefined);
                }
            });
            setModifiedTiles(p => { const m = new Map(p); strokeTiles.current.forEach(k => { const e = m.get(k) ?? new Set<PaintMode>(); e.add(mode); m.set(k, e); }); return m; });
            strokeTiles.current.clear();
        }
        if (!d) lastPos.current = null; setIsDrawing(d);
    }, [updateProviderTile]);

    const value: MapEditorContextType = {
        paintMode, brushSize, brushShape, brushColor, brushHeight, brushSoftness, isDrawing, isLoaded, modifiedTiles,
        setPaintMode, setBrushSize, setBrushShape, setBrushColor, setBrushHeight, setBrushSoftness,
        setIsDrawing: handleSetIsDrawing, paintAt, clearPreview, downloadModifiedTiles, loadAllTiles, setCanvasRefs, setMapTilesRef,
        pointerRef,
    };

    return <MapEditorContext.Provider value={value}>{children}</MapEditorContext.Provider>;
}
