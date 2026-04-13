import * as THREE from "three";

const TILE_RESOLUTION = 32;
const HEIGHT_SCALE = 20;

export const parseTileKey = (key: string) => key.split(",").map(Number) as [number, number];

export const tileToCanvas = (tileX: number, tileZ: number, startX: number, startZ: number, tileSize: number) =>
    [(tileX - startX) * tileSize, (tileZ - startZ) * tileSize] as const;

export const solidImageData = (size: number, r: number, g: number, b: number) => {
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    }
    return typeof ImageData === "undefined"
        ? ({ data, width: size, height: size } as ImageData)
        : new ImageData(data, size, size);
};

export const makeTexture = (data: ImageData, size: number) => {
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

export const buildHeightFieldFromImageData = (
    hd: ImageData,
    tileSizePx: number,
    resolution = TILE_RESOLUTION,
    scale = HEIGHT_SCALE,
) => {
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

export const imageToImageData = (img: HTMLImageElement | ImageBitmap | HTMLCanvasElement, size: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img as CanvasImageSource, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size);
};

export const disposeTextureMap = (textures: Map<string, THREE.Texture | null>) => {
    textures.forEach((texture) => texture?.dispose());
};

export const downloadTile = (key: string, type: string, data: ImageData, size: number) => new Promise<void>((resolve) => {
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

export const hexToRgb = (hex: string) => {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : [255, 255, 255];
};

export const brushIntensity = (distance: number, halfBrush: number, softness: number) => {
    if (softness <= 0) return 1;
    const ratio = distance / halfBrush;
    return ratio > 1 - softness
        ? 1 - Math.pow((ratio - (1 - softness)) / softness, 2) * (3 - 2 * ((ratio - (1 - softness)) / softness))
        : 1;
};

export const blend = (current: number, target: number, intensity: number) =>
    Math.round(current + (target - current) * intensity);