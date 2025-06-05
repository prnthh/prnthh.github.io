"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { ImprovedNoise } from "three/examples/jsm/Addons.js";

interface MapGridProps {
    width?: number;
    depth?: number;
    tileSize?: number;
    heightData: Uint8Array;
    onTileClick?: (coords: { x: number; y: number; z: number; i: number; j: number }) => void;
    debug?: boolean; // Add debug prop
}

// Export height generation utility
export function generateHeight(width: number, height: number) {
    const size = width * height;
    const data = new Uint8Array(size);
    const perlin = new ImprovedNoise();
    const z = Math.random() * 100;
    let quality = 1;
    for (let j = 0; j < 4; j++) {
        for (let i = 0; i < size; i++) {
            const x = i % width;
            const y = ~~(i / width);
            data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.2);
        }
        quality *= 4;
    }
    return data;
}

// Utility to generate a texture from height data (similar to Terrain)
function generateTexture(data: Uint8Array, width: number, height: number) {
    // Define color channel multipliers for green terrain

    // Dirt biome
    // const RED_BASE = 96;
    // const RED_SHADE = 128;
    // const GREEN_BASE = 32;
    // const GREEN_SHADE = 96;
    // const BLUE_BASE = 0;
    // const BLUE_SHADE = 96;

    // Grass biome (lighter)
    const RED_BASE = 64;
    const RED_SHADE = 64;
    const GREEN_BASE = 128;
    const GREEN_SHADE = 160;
    const BLUE_BASE = 64;
    const BLUE_SHADE = 64;

    // Shadow/shade intensity multiplier (1 = normal, <1 = less shadow, >1 = more shadow)
    const SHADE_INTENSITY = 0.01;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);

    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const imageData = image.data;

    const sun = new THREE.Vector3(1, 1, 1);
    sun.normalize();
    const vector3 = new THREE.Vector3(0, 0, 0);

    for (let i = 0, j = 0, l = imageData.length; i < l; i += 4, j++) {
        // Calculate normal for shading
        vector3.x = data[j - 2] - data[j + 2] || 0;
        vector3.y = 2;
        vector3.z = data[j - width * 2] - data[j + width * 2] || 0;
        vector3.normalize();
        const shade = vector3.dot(sun);
        // Blend closer to base color using SHADE_INTENSITY
        const blend = SHADE_INTENSITY; // 0 = only base, 1 = full shade
        imageData[i] = RED_BASE + (shade * RED_SHADE) * blend * (0.5 + data[j]);
        imageData[i + 1] = GREEN_BASE + (shade * GREEN_SHADE) * blend * (0.5 + data[j]);
        imageData[i + 2] = BLUE_BASE + (shade * BLUE_SHADE) * blend * (0.5 + data[j]);
        imageData[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);

    // Optionally scale up for more detail
    const canvasScaled = document.createElement('canvas');
    canvasScaled.width = width * 4;
    canvasScaled.height = height * 4;
    const scaledContext = canvasScaled.getContext('2d');
    if (scaledContext) {
        scaledContext.scale(4, 4);
        scaledContext.drawImage(canvas, 0, 0);
        const scaledImage = scaledContext.getImageData(0, 0, canvasScaled.width, canvasScaled.height);
        const scaledData = scaledImage.data;
        for (let i = 0, l = scaledData.length; i < l; i += 4) {
            const v = ~~(Math.random() * 5);
            scaledData[i] += v;
            scaledData[i + 1] += v;
            scaledData[i + 2] += v;
        }
        scaledContext.putImageData(scaledImage, 0, 0);
        const texture = new THREE.CanvasTexture(canvasScaled);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }
    // Fallback
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export default function MapGrid({
    width = 32,
    depth = 32,
    tileSize = 0.66,
    heightData,
    onTileClick,
    debug = false, // default to false
}: MapGridProps) {
    // Create a continuous plane geometry
    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(
            width * tileSize,
            depth * tileSize,
            width - 1,
            depth - 1
        );
        geo.rotateX(-Math.PI / 2);
        // Shift so (0,0) is at the corner, not center
        geo.translate((width * tileSize) / 2, 0, (depth * tileSize) / 2);
        const vertices = geo.attributes.position.array;
        for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
            vertices[j + 1] = heightData[i] * 0.08; // lower scale for less eccentricity
        }
        geo.computeVertexNormals();
        return geo;
    }, [heightData, width, depth, tileSize]);

    // Debug grid lines
    const gridLines = useMemo(() => {
        if (!debug) return null;
        const lines = [];
        const yOffset = 0.01; // Small offset to prevent z-fighting
        // Vertical lines (along z)
        for (let i = 0; i <= width; i++) {
            for (let j = 0; j < depth; j++) {
                // Each segment from (i, j) to (i, j+1)
                const idxA = j * width + Math.min(i, width - 1);
                const idxB = (j + 1) * width + Math.min(i, width - 1);
                const x = i * tileSize;
                const zA = j * tileSize;
                const zB = (j + 1) * tileSize;
                const yA = heightData[idxA] * 0.08 + yOffset;
                const yB = (j + 1 < depth) ? heightData[idxB] * 0.08 + yOffset : yA;
                lines.push(
                    x, yA, zA,
                    x, yB, zB
                );
            }
        }
        // Horizontal lines (along x)
        for (let j = 0; j <= depth; j++) {
            for (let i = 0; i < width; i++) {
                // Each segment from (i, j) to (i+1, j)
                const idxA = Math.min(j, depth - 1) * width + i;
                const idxB = Math.min(j, depth - 1) * width + (i + 1);
                const xA = i * tileSize;
                const xB = (i + 1) * tileSize;
                const z = j * tileSize;
                const yA = heightData[idxA] * 0.08 + yOffset;
                const yB = (i + 1 < width) ? heightData[idxB] * 0.08 + yOffset : yA;
                lines.push(
                    xA, yA, z,
                    xB, yB, z
                );
            }
        }
        // Removed translation to align grid with mesh
        return new THREE.BufferGeometry().setAttribute(
            'position',
            new THREE.Float32BufferAttribute(lines, 3)
        );
    }, [debug, width, depth, tileSize, heightData]);

    // Generate texture from height data
    const texture = useMemo(() => generateTexture(heightData, width, depth), [heightData, width, depth]);

    return (
        <>
            <mesh
                geometry={geometry}
                position={[-tileSize / 2, 0, -tileSize / 2]} // Offset mesh by half tileSize on x and z in the negative direction
                receiveShadow
                onClick={e => {
                    if (onTileClick) {
                        const point = e.point;
                        // Adjust for mesh offset
                        const x = point.x + tileSize / 2;
                        const z = point.z + tileSize / 2;
                        // Convert world position to grid indices
                        const i = Math.floor(x / tileSize);
                        const j = Math.floor(z / tileSize);
                        onTileClick({ x: point.x, y: point.y, z: point.z, i, j });
                    }
                }}
            >
                {texture ? (
                    <meshStandardMaterial map={texture} />
                ) : (
                    <meshStandardMaterial color={"#bfcdb7"} />
                )}
            </mesh>
            {debug && gridLines && (
                <lineSegments geometry={gridLines} position={[-tileSize / 2, 0, -tileSize / 2]}>
                    <lineBasicMaterial color="yellow" linewidth={2} />
                </lineSegments>
            )}
        </>
    );
}
