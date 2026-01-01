"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    ReactNode,
} from "react";
import {
    Texture,
    TextureLoader,
    RepeatWrapping,
    DataTexture,
    RGBAFormat,
} from "three";

/* ---------------------------------------------
   Types
--------------------------------------------- */

export interface MapData {
    colormap: Texture | null;

    // Raw source (loaded once)
    heightImage: ImageBitmap | null;

    // Authoritative terrain data
    heightField?: Float32Array;
    resolution?: number;
}

interface MapProviderValue {
    getTile(x: number, y: number): MapData;
    sampleHeight(x: number, z: number): number;
    isLoaded: boolean;
}

/* ---------------------------------------------
   Context
--------------------------------------------- */

const MapContext = createContext<MapProviderValue | null>(null);

export const useMap = () => {
    const ctx = useContext(MapContext);
    if (!ctx) {
        throw new Error("useMap must be used within MapProvider");
    }
    return ctx;
};

/* ---------------------------------------------
   Constants (single source of truth)
--------------------------------------------- */

const TILE_RESOLUTION = 32;   // segments per tile
const TILE_SIZE = 100;       // world units
const HEIGHT_SCALE = 20;     // max height

/* ---------------------------------------------
   Blank fallback textures (visual only)
--------------------------------------------- */

let blankColormap: Texture | null = null;

function getBlankColormap(): Texture {
    if (blankColormap) return blankColormap;

    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i + 0] = 200;
        data[i + 1] = 200;
        data[i + 2] = 200;
        data[i + 3] = 255;
    }

    const tex = new DataTexture(data, size, size, RGBAFormat);
    tex.needsUpdate = true;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;

    blankColormap = tex;
    return tex;
}

/* ---------------------------------------------
   Heightfield builder (CPU authority)
--------------------------------------------- */

function buildHeightField(
    image: ImageBitmap,
    resolution: number,
    heightScale: number
): Float32Array {
    const size = resolution + 1;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
        return new Float32Array(size * size);
    }

    ctx.drawImage(image, 0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size).data;

    const heights = new Float32Array(size * size);
    for (let i = 0; i < heights.length; i++) {
        heights[i] = (img[i * 4] / 255) * heightScale;
    }

    return heights;
}

/* ---------------------------------------------
   Provider
--------------------------------------------- */

export function MapProvider({ children }: { children: ReactNode }) {
    const [tiles, setTiles] = useState<Map<string, MapData>>(new Map());
    const [isLoaded, setIsLoaded] = useState(false);

    /* -------------------------------------------
       Load assets once
    ------------------------------------------- */

    useEffect(() => {
        const loader = new TextureLoader();
        const loaded = new Map<string, MapData>();

        const coords: Array<[number, number]> = [];
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                coords.push([x, y]);
            }
        }

        let pending = coords.length * 2;

        const finalize = () => {
            pending--;
            if (pending === 0) {
                // Build heightfields once
                for (const tile of loaded.values()) {
                    if (tile.heightImage) {
                        tile.heightField = buildHeightField(
                            tile.heightImage,
                            TILE_RESOLUTION,
                            HEIGHT_SCALE
                        );
                        tile.resolution = TILE_RESOLUTION;
                    }
                }

                setTiles(new Map(loaded));
                setIsLoaded(true);
            }
        };

        for (const [x, y] of coords) {
            const key = `${x},${y}`;
            const tile: MapData = {
                colormap: null,
                heightImage: null,
            };
            loaded.set(key, tile);

            /* --- Colormap (visual only) --- */
            loader.load(
                `/colormaps/${x}_${y}.jpg`,
                (tex) => {
                    tex.wrapS = RepeatWrapping;
                    tex.wrapT = RepeatWrapping;
                    tile.colormap = tex;
                    finalize();
                },
                undefined,
                () => {
                    tile.colormap = getBlankColormap();
                    finalize();
                }
            );

            /* --- Heightmap (data source) --- */
            fetch(`/heightmaps/${x}_${y}.png`)
                .then((r) => r.blob())
                .then((b) => createImageBitmap(b))
                .then((bmp) => {
                    tile.heightImage = bmp;
                    finalize();
                })
                .catch(() => {
                    tile.heightImage = null;
                    finalize();
                });
        }
    }, []);

    /* -------------------------------------------
       Tile lookup
    ------------------------------------------- */

    const getTile = useMemo(() => {
        return (tileX: number, tileZ: number): MapData => {
            return (
                tiles.get(`${tileX},${tileZ}`) ?? {
                    colormap: null,
                    heightImage: null,
                }
            );
        };
    }, [tiles]);


    /* -------------------------------------------
       Authoritative world height sampler
    ------------------------------------------- */

    const sampleHeight = useMemo(() => {
        return (x: number, z: number): number => {
            const tileX = Math.floor(x / TILE_SIZE);
            const tileZ = Math.floor(z / TILE_SIZE);
            const tile = tiles.get(`${tileX},${tileZ}`);
            if (!tile?.heightField || tile.resolution === undefined) return 0;

            const localX = (x - tileX * TILE_SIZE) / TILE_SIZE;
            const localZ = (z - tileZ * TILE_SIZE) / TILE_SIZE;

            const res = tile.resolution;
            const ix = Math.min(res, Math.max(0, Math.floor(localX * res)));
            const iz = Math.min(res, Math.max(0, Math.floor(localZ * res)));

            return tile.heightField[iz * (res + 1) + ix];
        };
    }, [tiles]);

    /* -------------------------------------------
       Context value
    ------------------------------------------- */

    const value = useMemo(
        () => ({
            getTile,
            sampleHeight,
            isLoaded,
        }),
        [getTile, sampleHeight, isLoaded]
    );

    return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
