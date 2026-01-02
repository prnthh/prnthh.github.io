"use client";

import React, { useMemo, useState, useCallback, useImperativeHandle, forwardRef, memo } from "react";
import * as THREE from "three";
import { RigidBody, HeightfieldCollider } from "@react-three/rapier";
import { ThreeEvent } from "@react-three/fiber";
import { useMap } from "./MapProvider";

export interface MapTilesRef {
    updateHeightData: (tileKey: string, heightData: Float32Array | null) => void;
    updateImageData: (tileKey: string, colorTexture: THREE.Texture | null) => void;
}

const setMapEntry = <T,>(setter: React.Dispatch<React.SetStateAction<Map<string, T>>>, tileKey: string, value: T) => {
    setter((prev) => {
        const next = new Map(prev);
        next.set(tileKey, value);
        return next;
    });
};

const buildTileGeometry = (heightField: Float32Array | null | undefined, resolution: number, tileSize: number) => {
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

interface TileProps {
    tileX: number;
    tileZ: number;
    tileSize: number;
    physics?: boolean;
    heightData?: Float32Array | null;
    colorTexture?: THREE.Texture | null;
    showWireframe?: boolean;
    onClick?: (e: ThreeEvent<MouseEvent>) => void;
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
    physics,
    heightData: externalHeightData,
    colorTexture: externalColorTexture,
    showWireframe,
    onClick,
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

    const geometry = useMemo(() => buildTileGeometry(heightField, resolution, tileSize), [heightField, resolution, tileSize]);

    const worldX = tileX * tileSize;
    const worldZ = tileZ * tileSize;
    const mesh = (
        <mesh
            geometry={geometry}
            position={[worldX + tileSize / 2, 0, worldZ + tileSize / 2]}
            onClick={onClick}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <meshStandardMaterial map={colormap ?? undefined} wireframe={showWireframe} />
        </mesh>
    );

    const rapierHeightField = useMemo(() => {
        const res = resolution || 32;
        return heightField ? buildRapierHeightfield(heightField, res) : buildFlatHeightfield(res);
    }, [heightField, resolution]);


    if (!physics) {
        return mesh;
    }

    return (
        <RigidBody type="fixed" colliders={false}>
            {mesh}
            <HeightfieldCollider
                args={[
                    resolution || 32,
                    resolution || 32,
                    rapierHeightField as unknown as number[],
                    { x: tileSize, y: 1, z: tileSize },
                ]}
                position={[worldX + tileSize / 2, 0, worldZ + tileSize / 2]}
            />
        </RigidBody>
    );

});

/* Tile grid with ref for external updates */
interface MapTilesProps {
    tileSize?: number;
    viewRadius?: number;
    startX?: number;
    startZ?: number;
    endX?: number;
    endZ?: number;
    physics?: boolean;
    paintMode?: "height" | "color";
    onClick?: (e: ThreeEvent<MouseEvent>) => void;
    onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerEnter?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerLeave?: () => void;
}

export const MapTiles = forwardRef<MapTilesRef, MapTilesProps>(function MapTiles({
    tileSize = 100,
    viewRadius = 2,
    startX = 0,
    startZ = 0,
    endX = 0,
    endZ = 0,
    physics,
    paintMode,
    onClick,
    onPointerMove,
    onPointerDown,
    onPointerUp,
    onPointerEnter,
    onPointerLeave,
}, ref) {
    const { isLoaded } = useMap();

    // Local state for dynamic tile updates
    const [heightDataMap, setHeightDataMap] = useState<Map<string, Float32Array | null>>(new Map());
    const [colorTextureMap, setColorTextureMap] = useState<Map<string, THREE.Texture | null>>(new Map());

    const updateHeightData = useCallback((tileKey: string, heightData: Float32Array | null) => {
        setMapEntry(setHeightDataMap, tileKey, heightData);
    }, [setHeightDataMap]);

    const updateColorTexture = useCallback((tileKey: string, texture: THREE.Texture | null) => {
        setMapEntry(setColorTextureMap, tileKey, texture);
    }, [setColorTextureMap]);

    useImperativeHandle(ref, () => ({
        updateHeightData,
        updateImageData: (tileKey: string, texture: THREE.Texture | null) => {
            // Always update color texture
            updateColorTexture(tileKey, texture);
        }
    }), [updateHeightData, updateColorTexture]);

    if (!isLoaded) return null;

    const tiles = [];

    for (let x = startX; x <= endX; x++) {
        for (let z = startZ; z <= endZ; z++) {
            const tileKey = `${x},${z}`;
            // Always show color texture
            const colorTexture = colorTextureMap.get(tileKey);

            tiles.push(
                <Tile
                    key={`${tileKey}-${paintMode}`}
                    tileX={x}
                    tileZ={z}
                    tileSize={tileSize}
                    physics={physics}
                    heightData={heightDataMap.get(tileKey)}
                    colorTexture={colorTexture}
                    showWireframe={paintMode === "height"}
                    onClick={onClick}
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
});

MapTiles.displayName = "MapTiles";

function buildRapierHeightfield(src: Float32Array, res: number): Float32Array {
    const size = res + 1;
    const out = new Float32Array(size * size);
    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            out[x * size + z] = src[z * size + x]; // Transpose X/Z
        }
    }
    return out;
}

function buildFlatHeightfield(res: number): Float32Array {
    const size = res + 1;
    return new Float32Array(size * size); // all zeros
}
