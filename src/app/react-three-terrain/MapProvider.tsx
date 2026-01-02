"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { Texture, TextureLoader, RepeatWrapping, DataTexture, RGBAFormat } from "three";

export interface GridConfig {
    startX: number; endX: number; startZ: number; endZ: number; tileSizePx: number;
    gridSizeX: number; gridSizeZ: number; canvasSizeX: number; canvasSizeZ: number; canvasSize: number;
    pixelToTile: (px: number, py: number) => [number, number];
    tileToPixel: (tileX: number, tileZ: number) => [number, number];
    worldToPixel: (worldX: number, worldZ: number, worldTileSize: number) => [number, number];
}

export interface MapData {
    colormap: Texture | null;
    heightImage: ImageBitmap | null;
    heightField?: Float32Array;
    resolution?: number;
}

interface MapProviderValue {
    getTile(x: number, y: number): MapData;
    sampleHeight(x: number, z: number): number;
    updateTile(x: number, y: number, heightData?: ImageData, colorData?: ImageData): void;
    setPreviewTile(x: number, z: number, heightData?: ImageData, colorData?: ImageData): void;
    clearPreviewTiles(): void;
    getTileImages(tileX: number, tileZ: number): { height: ImageData; color: ImageData };
    isLoaded: boolean;
    gridConfig: GridConfig;
}

const MapContext = createContext<MapProviderValue | null>(null);

export const useMap = () => {
    const ctx = useContext(MapContext);
    if (!ctx) {
        throw new Error("useMap must be used within MapProvider");
    }
    return ctx;
};

const TILE_RESOLUTION = 32, TILE_SIZE = 100, HEIGHT_SCALE = 20;
const tileKey = (x: number, y: number) => `${x},${y}`;

const mkCanvas = (w: number, h: number) => typeof document !== "undefined" ? Object.assign(document.createElement("canvas"), { width: w, height: h }) : null;

const createTextureFromImageData = (data: ImageData) => {
    const canvas = mkCanvas(data.width, data.height);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(data, 0, 0);
    const tex = new Texture(ctx.canvas); tex.needsUpdate = true; tex.wrapS = tex.wrapT = RepeatWrapping;
    return tex;
};

const solidImageData = (size: number, r: number, g: number, b: number) => {
    if (typeof ImageData === "undefined") return null;
    const d = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < d.length; i += 4) d.set([r, g, b, 255], i);
    return new ImageData(d, size, size);
};

const imgToData = (img: HTMLImageElement | ImageBitmap, size: number) => {
    const canvas = mkCanvas(size, size);
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size);
};

const buildHeightFieldFromImageData = (hd: ImageData, res = TILE_RESOLUTION) => {
    const s = res + 1, hf = new Float32Array(s * s), { width: w, height: h, data: d } = hd;
    for (let z = 0; z < s; z++) for (let x = 0; x < s; x++) {
        const idx = (Math.floor((z / res) * (h - 1)) * w + Math.floor((x / res) * (w - 1))) * 4;
        hf[z * s + x] = (d[idx] / 255) * HEIGHT_SCALE;
    }
    return hf;
};

let _blankTex: Texture | null = null;
const getBlankColormap = () => {
    if (_blankTex) return _blankTex;
    const d = new Uint8Array(64 * 64 * 4); for (let i = 0; i < d.length; i += 4) d.set([200, 200, 200, 255], i);
    _blankTex = new DataTexture(d, 64, 64, RGBAFormat); _blankTex.needsUpdate = true; _blankTex.wrapS = _blankTex.wrapT = RepeatWrapping;
    return _blankTex;
};

const buildHeightField = (img: ImageBitmap, res: number, scale: number) => {
    const s = res + 1;
    const canvas = mkCanvas(s, s);
    if (!canvas) return new Float32Array(s * s);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return new Float32Array(s * s);
    ctx.drawImage(img, 0, 0, s, s);
    const d = ctx.getImageData(0, 0, s, s).data;
    return Float32Array.from({ length: s * s }, (_, i) => (d[i * 4] / 255) * scale);
};

/* Provider */

export function MapProvider({
    children,
    startX = -1,
    endX = 1,
    startZ = -1,
    endZ = 1,
    tileSizePx = 256,
    basepath = "/terrain/",
}: {
    children: ReactNode;
    startX?: number;
    endX?: number;
    startZ?: number;
    endZ?: number;
    tileSizePx?: number;
    basepath?: string;
}) {
    const [tiles, setTiles] = useState<Map<string, MapData>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);
    const [previewTiles, setPreviewTiles] = useState<Map<string, Partial<MapData>>>(new Map());
    const blankColor = useMemo(() => {
        const data = solidImageData(tileSizePx, 200, 200, 200);
        if (data) return data;
        return typeof ImageData !== "undefined" ? new ImageData(tileSizePx, tileSizePx) : null;
    }, [tileSizePx]);
    const blankHeight = useMemo(() => {
        const data = solidImageData(tileSizePx, 0, 0, 0);
        if (data) return data;
        return typeof ImageData !== "undefined" ? new ImageData(tileSizePx, tileSizePx) : null;
    }, [tileSizePx]);

    const gridConfig = useMemo<GridConfig>(() => {
        const gX = endX - startX + 1, gZ = endZ - startZ + 1, cX = tileSizePx * gX, cZ = tileSizePx * gZ;
        return {
            startX, endX, startZ, endZ, tileSizePx, gridSizeX: gX, gridSizeZ: gZ,
            canvasSizeX: cX, canvasSizeZ: cZ, canvasSize: Math.max(cX, cZ),
            pixelToTile: (px, py) => [Math.floor(px / tileSizePx) + startX, Math.floor(py / tileSizePx) + startZ],
            tileToPixel: (tx, tz) => [(tx - startX) * tileSizePx, (tz - startZ) * tileSizePx],
            worldToPixel: (wx, wz, ws) => [Math.floor((wx / ws - startX) * tileSizePx), Math.floor((wz / ws - startZ) * tileSizePx)],
        };
    }, [startX, endX, startZ, endZ, tileSizePx]);

    useEffect(() => {
        const bp = basepath.replace(/\/$/, ""), loader = new TextureLoader(), loaded = new Map<string, MapData>();
        const coords = [-1, 0, 1].flatMap(x => [-1, 0, 1].map(y => [x, y] as [number, number]));
        let pending = coords.length * 2;
        const done = () => {
            if (--pending === 0) {
                loaded.forEach(t => { if (t.heightImage) { t.heightField = buildHeightField(t.heightImage, TILE_RESOLUTION, HEIGHT_SCALE); t.resolution = TILE_RESOLUTION; } });
                setTiles(new Map(loaded)); setIsLoaded(true);
            }
        };
        for (const [x, y] of coords) {
            const key = tileKey(x, y), tile: MapData = { colormap: null, heightImage: null };
            loaded.set(key, tile);
            loader.load(`${bp}/colormaps/${x}_${y}.jpg`, tex => { tex.wrapS = tex.wrapT = RepeatWrapping; tile.colormap = tex; done(); }, undefined, () => { tile.colormap = getBlankColormap(); done(); });
            fetch(`${bp}/heightmaps/${x}_${y}.png`).then(r => r.blob()).then(b => createImageBitmap(b)).then(bmp => { tile.heightImage = bmp; done(); }).catch(() => { tile.heightImage = null; done(); });
        }
    }, [basepath]);

    const getTile = useCallback((tileX: number, tileZ: number): MapData => {
        const key = tileKey(tileX, tileZ), base = tiles.get(key) ?? { colormap: null, heightImage: null }, pv = previewTiles.get(key);
        return pv ? { ...base, ...(pv.colormap && { colormap: pv.colormap }), ...(pv.heightField && { heightField: pv.heightField }), ...(pv.resolution !== undefined && { resolution: pv.resolution }) } : base;
    }, [tiles, previewTiles]);

    const sampleHeight = useCallback((x: number, z: number): number => {
        const tx = Math.floor(x / TILE_SIZE), tz = Math.floor(z / TILE_SIZE), t = tiles.get(tileKey(tx, tz));
        if (!t?.heightField || t.resolution === undefined) return 0;
        const lx = (x - tx * TILE_SIZE) / TILE_SIZE, lz = (z - tz * TILE_SIZE) / TILE_SIZE, r = t.resolution;
        const clamp = (v: number) => Math.min(r, Math.max(0, Math.floor(v * r)));
        return t.heightField[clamp(lz) * (r + 1) + clamp(lx)];
    }, [tiles]);

    const setPreviewTile = useCallback((tileX: number, tileZ: number, heightData?: ImageData, colorData?: ImageData) => {
        if (!heightData && !colorData) return;
        const pv: Partial<MapData> = {};
        if (colorData) { const tex = createTextureFromImageData(colorData); if (tex) pv.colormap = tex; }
        if (heightData) { pv.heightField = buildHeightFieldFromImageData(heightData); pv.resolution = TILE_RESOLUTION; }
        setPreviewTiles(p => { const u = new Map(p); u.set(tileKey(tileX, tileZ), pv); return u; });
    }, []);

    const clearPreviewTiles = useCallback(() => setPreviewTiles(p => p.size > 0 ? new Map() : p), []);

    const getTileImages = useCallback((tileX: number, tileZ: number) => {
        const t = tiles.get(tileKey(tileX, tileZ));
        const height = (t?.heightImage ? imgToData(t.heightImage, tileSizePx) : null) ?? blankHeight ?? (typeof ImageData !== "undefined" ? new ImageData(tileSizePx, tileSizePx) : null);
        const colorImg = t?.colormap?.image;
        const color = (colorImg && (colorImg instanceof HTMLImageElement || colorImg instanceof HTMLCanvasElement || colorImg instanceof ImageBitmap)
            ? imgToData(colorImg as any, tileSizePx) : null) ?? blankColor ?? (typeof ImageData !== "undefined" ? new ImageData(tileSizePx, tileSizePx) : null);
        return { height: height!, color: color! };
    }, [tiles, tileSizePx, blankHeight, blankColor]);

    const updateTile = useCallback((tileX: number, tileZ: number, heightData?: ImageData, colorData?: ImageData) => {
        const key = tileKey(tileX, tileZ);
        if (!heightData && !colorData) return;
        if (colorData) {
            const tex = createTextureFromImageData(colorData);
            if (tex) setTiles(p => { const t = p.get(key); if (!t) return p; const u = new Map(p); u.set(key, { ...t, colormap: tex }); return u; });
        }
        if (heightData) {
            createImageBitmap(heightData).then(bmp => setTiles(p => {
                const t = p.get(key); if (!t) return p;
                const u = new Map(p); u.set(key, { ...t, heightImage: bmp, heightField: buildHeightField(bmp, TILE_RESOLUTION, HEIGHT_SCALE), resolution: TILE_RESOLUTION });
                return u;
            }));
        }
    }, []);

    const value = useMemo(() => ({ getTile, sampleHeight, updateTile, setPreviewTile, clearPreviewTiles, getTileImages, isLoaded, gridConfig }),
        [getTile, sampleHeight, updateTile, setPreviewTile, clearPreviewTiles, getTileImages, isLoaded, gridConfig]);

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
