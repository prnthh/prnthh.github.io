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
    canvasSize: number;
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
    loadImage(file: File): Promise<void>;
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

const tileKey = (x: number, y: number) => `${x},${y}`;

const createTextureFromImageData = (data: ImageData) => {
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
    const [skipDiskLoad, setSkipDiskLoad] = useState(false);

    const blankColormap = useMemo(() => {
        if (typeof ImageData === 'undefined') return null;
        const data = new Uint8ClampedArray(64 * 64 * 4);
        for (let i = 0; i < data.length; i += 4) data.set([200, 200, 200, 255], i);
        return createTextureFromImageData(new ImageData(data, 64, 64));
    }, []);

    const blankHeightImage = useMemo(() => {
        if (typeof ImageData === 'undefined') return null;
        const data = new Uint8ClampedArray(64 * 64 * 4);
        for (let i = 0; i < data.length; i += 4) data.set([0, 0, 0, 255], i);
        return new ImageData(data, 64, 64);
    }, []);

    const gridConfig = useMemo<GridConfig>(() => {
        const cX = tileSizePx * (endX - startX + 1), cZ = tileSizePx * (endZ - startZ + 1);
        return {
            startX, endX, startZ, endZ, tileSizePx,
            canvasSize: Math.max(cX, cZ),
        };
    }, [startX, endX, startZ, endZ, tileSizePx]);

    useEffect(() => {
        if (skipDiskLoad) return;

        setIsLoaded(false);
        setTiles(new Map());

        const bp = basepath.replace(/\/$/, ""), loader = new TextureLoader(), loaded = new Map<string, MapData>();
        const coords: [number, number][] = [];
        for (let x = startX; x <= endX; x++) {
            for (let z = startZ; z <= endZ; z++) coords.push([x, z]);
        }

        let pending = coords.length * 2;
        const done = () => {
            if (--pending === 0) {
                loaded.forEach(t => {
                    if (t.heightImage) {
                        t.heightField = buildHeightField(t.heightImage, TILE_RESOLUTION, HEIGHT_SCALE);
                        t.resolution = TILE_RESOLUTION;
                    } else if (blankHeightImage) {
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
    }, [basepath, blankColormap, blankHeightImage, startX, endX, startZ, endZ, skipDiskLoad]);

    const getTile = useCallback((tileX: number, tileZ: number): MapData => {
        const tile = tiles.get(tileKey(tileX, tileZ));
        if (!tile) {
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
        const tx = Math.floor(x / TILE_SIZE), tz = Math.floor(z / TILE_SIZE);
        const t = tiles.get(tileKey(tx, tz));
        if (!t?.heightField || t.resolution === undefined) return 0;
        const lx = (x - tx * TILE_SIZE) / TILE_SIZE, lz = (z - tz * TILE_SIZE) / TILE_SIZE;
        const r = t.resolution;
        const clamp = (v: number) => Math.min(r, Math.max(0, Math.floor(v * r)));
        return t.heightField[clamp(lz) * (r + 1) + clamp(lx)];
    }, [tiles]);

    const updateTile = useCallback((tileX: number, tileZ: number, heightData?: ImageData, colorData?: ImageData) => {
        const key = tileKey(tileX, tileZ);
        if (!heightData && !colorData) return;

        if (colorData) {
            const tex = createTextureFromImageData(colorData);
            if (tex) setTiles(p => {
                const t = p.get(key);
                if (!t) return p;
                const u = new Map(p);
                u.set(key, { ...t, colormap: tex });
                return u;
            });
        }

        if (heightData) {
            createImageBitmap(heightData).then(bmp => setTiles(p => {
                const t = p.get(key);
                if (!t) return p;
                const u = new Map(p);
                u.set(key, {
                    ...t,
                    heightImage: bmp,
                    heightField: buildHeightField(bmp, TILE_RESOLUTION, HEIGHT_SCALE),
                    resolution: TILE_RESOLUTION
                });
                return u;
            }));
        }
    }, []);

    const loadImage = useCallback((file: File) => {
        return new Promise<void>((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = tileSizePx;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error("Could not get 2D context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, tileSizePx, tileSizePx);

                const texture = new Texture(canvas);
                texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
                texture.minFilter = LinearMipMapLinearFilter;
                texture.magFilter = LinearFilter;
                texture.generateMipmaps = true;
                texture.needsUpdate = true;

                const newTiles = new Map<string, MapData>();
                for (let x = startX; x <= endX; x++) {
                    for (let z = startZ; z <= endZ; z++) {
                        newTiles.set(tileKey(x, z), {
                            colormap: (x === 0 && z === 0) ? texture : blankColormap,
                            heightImage: null,
                            heightField: new Float32Array((TILE_RESOLUTION + 1) * (TILE_RESOLUTION + 1)).fill(0),
                            resolution: TILE_RESOLUTION
                        });
                    }
                }

                setSkipDiskLoad(true);
                setTiles(newTiles);
                setIsLoaded(true);
                URL.revokeObjectURL(objectUrl);
                resolve();
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Failed to load image"));
            };

            img.src = objectUrl;
        });
    }, [tileSizePx, startX, endX, startZ, endZ, blankColormap]);

    const value = useMemo(() => ({ getTile, sampleHeight, updateTile, loadImage, isLoaded, gridConfig }),
        [getTile, sampleHeight, updateTile, loadImage, isLoaded, gridConfig]);

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
