"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { Texture, TextureLoader, ClampToEdgeWrapping, LinearFilter, LinearMipMapLinearFilter } from "three";

/**
 * MapProvider handles terrain map loading and tile management.
 *
 * Responsibilities:
 * - Loading terrain tiles (heightmaps and colormaps) from disk
 * - Storing tile data in memory
 * - Providing read access via getTile() and sampleHeight()
 * - Receiving updates from MapEditorProvider via updateTile()
 * - Managing grid configuration for coordinate conversions
 */

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

export const TILE_RESOLUTION = 32, TILE_SIZE = 100, HEIGHT_SCALE = 20;
export const tileKey = (x: number, y: number) => `${x},${y}`;

export const buildHeightFieldFromImageData = (hd: ImageData, tileSizePx: number, resolution = TILE_RESOLUTION, scale = HEIGHT_SCALE) => {
    const gridSize = resolution + 1;
    const hf = new Float32Array(gridSize * gridSize);
    for (let gz = 0; gz < gridSize; gz++) {
        for (let gx = 0; gx < gridSize; gx++) {
            const sx = Math.floor((gx / resolution) * (tileSizePx - 1));
            const sz = Math.floor((gz / resolution) * (tileSizePx - 1));
            hf[gz * gridSize + gx] = (hd.data[(sz * tileSizePx + sx) * 4] / 255) * scale;
        }
    }
    return hf;
};

export const createTextureFromImageData = (data: ImageData) => {
    const canvas = document.createElement("canvas");
    canvas.width = data.width;
    canvas.height = data.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(data, 0, 0);
    const tex = new Texture(ctx.canvas);
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
    tex.minFilter = LinearMipMapLinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = true;
    return tex;
};

export const imageToImageData = (img: HTMLImageElement | ImageBitmap | HTMLCanvasElement, size: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img as any, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size);
};

const buildHeightField = (img: ImageBitmap, res: number, scale: number) => {
    const s = res + 1;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = s;
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

    // Create blank colormap texture once
    const blankColormap = useMemo(() => {
        if (typeof ImageData === 'undefined') return null;
        const data = new Uint8ClampedArray(64 * 64 * 4);
        for (let i = 0; i < data.length; i += 4) {
            data.set([200, 200, 200, 255], i);
        }
        const imageData = new ImageData(data, 64, 64);
        const tex = createTextureFromImageData(imageData);
        return tex;
    }, []);

    // Create blank heightImage once (flat plane)
    const blankHeightImage = useMemo(() => {
        if (typeof ImageData === 'undefined') return null;
        const data = new Uint8ClampedArray(64 * 64 * 4);
        for (let i = 0; i < data.length; i += 4) {
            data.set([0, 0, 0, 255], i); // black for zero height
        }
        return new ImageData(data, 64, 64);
    }, []);

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
                // Build heightFields for all tiles, using blank fallback if needed
                loaded.forEach(t => {
                    if (t.heightImage) {
                        t.heightField = buildHeightField(t.heightImage, TILE_RESOLUTION, HEIGHT_SCALE);
                        t.resolution = TILE_RESOLUTION;
                    } else if (blankHeightImage) {
                        // Create fallback heightImage from blank ImageData
                        createImageBitmap(blankHeightImage).then(bmp => {
                            t.heightImage = bmp;
                            t.heightField = buildHeightField(bmp, TILE_RESOLUTION, HEIGHT_SCALE);
                            t.resolution = TILE_RESOLUTION;
                        });
                    }
                });
                setTiles(new Map(loaded));
                setIsLoaded(true);
            }
        };
        for (const [x, y] of coords) {
            const key = tileKey(x, y), tile: MapData = { colormap: null, heightImage: null };
            loaded.set(key, tile);
            loader.load(
                `${bp}/${x}_${y}_color.png`,
                tex => {
                    tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
                    tex.minFilter = LinearMipMapLinearFilter;
                    tex.magFilter = LinearFilter;
                    tex.generateMipmaps = true;
                    tile.colormap = tex;
                    done();
                },
                undefined,
                () => { tile.colormap = blankColormap; done(); }
            );
            fetch(`${bp}/${x}_${y}_height.png`)
                .then(r => r.blob())
                .then(b => createImageBitmap(b))
                .then(bmp => { tile.heightImage = bmp; done(); })
                .catch(() => { tile.heightImage = null; done(); });
        }
    }, [basepath, blankColormap, blankHeightImage]);

    const getTile = useCallback((tileX: number, tileZ: number): MapData => {
        const key = tileKey(tileX, tileZ);
        const tile = tiles.get(key);
        if (!tile) {
            // Return fallback data for missing tiles
            return {
                colormap: blankColormap,
                heightImage: null,
                heightField: new Float32Array((TILE_RESOLUTION + 1) * (TILE_RESOLUTION + 1)).fill(0),
                resolution: TILE_RESOLUTION
            };
        }
        return tile;
    }, [tiles, blankColormap]);

    const sampleHeight = useCallback((x: number, z: number): number => {
        const tx = Math.floor(x / TILE_SIZE), tz = Math.floor(z / TILE_SIZE), t = tiles.get(tileKey(tx, tz));
        if (!t?.heightField || t.resolution === undefined) return 0;
        const lx = (x - tx * TILE_SIZE) / TILE_SIZE, lz = (z - tz * TILE_SIZE) / TILE_SIZE, r = t.resolution;
        const clamp = (v: number) => Math.min(r, Math.max(0, Math.floor(v * r)));
        return t.heightField[clamp(lz) * (r + 1) + clamp(lx)];
    }, [tiles]);

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

    const value = useMemo(() => ({ getTile, sampleHeight, updateTile, isLoaded, gridConfig }),
        [getTile, sampleHeight, updateTile, isLoaded, gridConfig]);

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
