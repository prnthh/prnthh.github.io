"use client";

import { memo, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useMap, TILE_RESOLUTION, HEIGHT_SCALE } from "./MapProvider";
import { MapSplatMaterial } from "./MapSplatMaterial";

const buildTileGeometry = (
    heightField: Float32Array | null | undefined,
    resolution: number,
    tileSize: number
) => {
    const geo = new THREE.PlaneGeometry(tileSize, tileSize, resolution, resolution);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
        const value = heightField && i < heightField.length ? heightField[i] : 0;
        pos.setY(i, value);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
};

const buildBoundaryGeometry = (
    heightField: Float32Array | null,
    resolution: number,
    tileSize: number,
) => {
    const halfSize = tileSize / 2;
    const step = tileSize / resolution;
    const points: THREE.Vector3[] = [];

    const pushPoint = (gridX: number, gridZ: number) => {
        const index = gridZ * (resolution + 1) + gridX;
        const height = heightField?.[index] ?? 0;
        points.push(new THREE.Vector3(
            -halfSize + gridX * step,
            height + 0.08,
            -halfSize + gridZ * step,
        ));
    };

    for (let gridX = 0; gridX <= resolution; gridX++) pushPoint(gridX, 0);
    for (let gridZ = 1; gridZ <= resolution; gridZ++) pushPoint(resolution, gridZ);
    for (let gridX = resolution - 1; gridX >= 0; gridX--) pushPoint(gridX, resolution);
    for (let gridZ = resolution - 1; gridZ > 0; gridZ--) pushPoint(0, gridZ);
    pushPoint(0, 0);

    return new THREE.BufferGeometry().setFromPoints(points);
};

const heightFieldToTexture = (heightField: Float32Array, resolution: number, scale = HEIGHT_SCALE) => {
    const size = resolution + 1;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < heightField.length; i++) {
        const value = Math.floor((heightField[i] / scale) * 255);
        const idx = i * 4;
        imageData.data[idx] = imageData.data[idx + 1] = imageData.data[idx + 2] = value;
        imageData.data[idx + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.Texture(canvas);
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
};

interface TileProps {
    tileX: number;
    tileZ: number;
    tileSize: number;
    heightData?: Float32Array | null;
    colorTexture?: THREE.Texture | null;
    showWireframe?: boolean;
    showTileBoundaries?: boolean;
    neighborHeightData?: {
        left?: Float32Array | null;
        right?: Float32Array | null;
        top?: Float32Array | null;
        bottom?: Float32Array | null;
    };
    paintMode?: "height" | "color";
    onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerEnter?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerLeave?: () => void;
}

const Tile = memo(function Tile({
    tileX,
    tileZ,
    tileSize,
    heightData: externalHeightData,
    colorTexture: externalColorTexture,
    showWireframe,
    showTileBoundaries,
    neighborHeightData,
    paintMode,
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerEnter,
    onPointerLeave,
}: TileProps) {
    const { getTile } = useMap();
    const tile = getTile(tileX, tileZ);

    const heightField = externalHeightData ?? tile.heightField;
    const colormap = externalColorTexture ?? tile.colormap;
    const resolution = tile.resolution ?? 32;

    const neighborHeights = useMemo(() => {
        if (!heightField) return undefined;

        return {
            left: neighborHeightData?.left ?? getTile(tileX - 1, tileZ).heightField,
            right: neighborHeightData?.right ?? getTile(tileX + 1, tileZ).heightField,
            top: neighborHeightData?.top ?? getTile(tileX, tileZ - 1).heightField,
            bottom: neighborHeightData?.bottom ?? getTile(tileX, tileZ + 1).heightField,
        };
    }, [getTile, tileX, tileZ, heightField, neighborHeightData]);

    // Create stitched heightfield for rendering.
    const stitchedHeightField = useMemo(() => {
        if (!heightField) return null;
        const gridSize = resolution + 1;
        const stitched = new Float32Array(heightField.length);
        stitched.set(heightField);

        // Apply edge stitching to the heightfield
        // Each tile defers its LEFT and TOP edges to its neighbors
        // This creates a consistent authority hierarchy: negative coords have authority over positive coords
        if (neighborHeights) {
            for (let z = 0; z < gridSize; z++) {
                for (let x = 0; x < gridSize; x++) {
                    const i = z * gridSize + x;

                    // Left edge: defer to left neighbor's right edge
                    if (x === 0 && neighborHeights.left) {
                        const neighborIdx = z * gridSize + resolution;
                        stitched[i] = neighborHeights.left[neighborIdx] ?? stitched[i];
                    }

                    // Top edge: defer to top neighbor's bottom edge
                    if (z === 0 && neighborHeights.top) {
                        const neighborIdx = resolution * gridSize + x;
                        stitched[i] = neighborHeights.top[neighborIdx] ?? stitched[i];
                    }
                }
            }
        }

        return stitched;
    }, [heightField, resolution, neighborHeights]);

    const geometry = useMemo(
        () => buildTileGeometry(stitchedHeightField, resolution, tileSize),
        [stitchedHeightField, resolution, tileSize]
    );

    const boundaryGeometry = useMemo(
        () => buildBoundaryGeometry(stitchedHeightField, resolution, tileSize),
        [stitchedHeightField, resolution, tileSize]
    );

    const worldX = tileX * tileSize;
    const worldZ = tileZ * tileSize;
    const position = useMemo<[number, number, number]>(
        () => [worldX + tileSize / 2, 0, worldZ + tileSize / 2],
        [worldX, worldZ, tileSize]
    );

    // Create heightmap texture for visualization
    const heightTexture = useMemo(() => {
        if (!stitchedHeightField) return null;
        return heightFieldToTexture(stitchedHeightField, resolution || TILE_RESOLUTION, HEIGHT_SCALE);
    }, [stitchedHeightField, resolution]);

    const meshElement = (
        <group>
            <mesh
                geometry={geometry}
                position={position}
                receiveShadow
                onPointerMove={onPointerMove}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
            >
                {paintMode === "color" ? (
                    <MapSplatMaterial colorTexture={colormap} textureScale={4} />
                ) : (
                    <meshStandardMaterial map={heightTexture ?? undefined} />
                )}
            </mesh>

            {paintMode === "height" && showWireframe && (
                <mesh geometry={geometry} position={position} raycast={() => null} renderOrder={1}>
                    <meshBasicMaterial
                        color="#2563eb"
                        wireframe
                        transparent
                        opacity={0.9}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {showTileBoundaries && (
                <lineSegments geometry={boundaryGeometry} position={position} raycast={() => null} renderOrder={2}>
                    <lineBasicMaterial color="#dc2626" transparent opacity={0.95} depthWrite={false} />
                </lineSegments>
            )}
        </group>
    );

    return meshElement;

});

/* Tile grid renderer */
interface MapTilesProps {
    tileSize?: number;
    startX?: number;
    startZ?: number;
    endX?: number;
    endZ?: number;
    paintMode?: "height" | "color";
    showWireframe?: boolean;
    showTileBoundaries?: boolean;
    previewHeightDataMap?: Map<string, Float32Array | null>;
    previewColorTextureMap?: Map<string, THREE.Texture | null>;
    onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerEnter?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerLeave?: () => void;
}

export function MapTiles({
    tileSize = 100,
    startX = 0,
    startZ = 0,
    endX = 0,
    endZ = 0,
    paintMode,
    showWireframe,
    showTileBoundaries,
    previewHeightDataMap,
    previewColorTextureMap,
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerEnter,
    onPointerLeave,
}: MapTilesProps) {
    const { isLoaded } = useMap();

    if (!isLoaded) return null;

    const tiles = [];

    for (let x = startX; x <= endX; x++) {
        for (let z = startZ; z <= endZ; z++) {
            const tileKey = `${x},${z}`;

            tiles.push(
                <Tile
                    key={`${tileKey}-${paintMode}`}
                    tileX={x}
                    tileZ={z}
                    tileSize={tileSize}
                    heightData={previewHeightDataMap?.get(tileKey)}
                    showTileBoundaries={showTileBoundaries}
                    neighborHeightData={previewHeightDataMap ? {
                        left: previewHeightDataMap.get(`${x - 1},${z}`),
                        right: previewHeightDataMap.get(`${x + 1},${z}`),
                        top: previewHeightDataMap.get(`${x},${z - 1}`),
                        bottom: previewHeightDataMap.get(`${x},${z + 1}`),
                    } : undefined}
                    colorTexture={previewColorTextureMap?.get(tileKey)}
                    showWireframe={showWireframe}
                    paintMode={paintMode}
                    onPointerMove={onPointerMove}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
                />
            );
        }
    }

    return <group>{tiles}</group>;
}
