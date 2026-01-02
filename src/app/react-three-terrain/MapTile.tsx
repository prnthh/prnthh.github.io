"use client";

import { memo, useMemo } from "react";
import * as THREE from "three";
import { RigidBody, HeightfieldCollider } from "@react-three/rapier";
import { useMap } from "./MapProvider";

/* ---------------------------------------------
   Tile component
--------------------------------------------- */

const Tile = memo(function Tile({
    tileX,
    tileZ,
    tileSize,
    physics,
}: {
    tileX: number;
    tileZ: number;
    tileSize: number;
    physics?: boolean;
}) {
    const { getTile } = useMap();
    const tile = getTile(tileX, tileZ);

    const heightField = tile.heightField;
    const resolution = tile.resolution ?? 0;

    const worldX = tileX * tileSize;
    const worldZ = tileZ * tileSize;

    /* -------------------------------------------
       Build geometry from heightField (once)
    ------------------------------------------- */

    const geometry = useMemo(() => {
        const res = resolution || 32;

        const geo = new THREE.PlaneGeometry(
            tileSize,
            tileSize,
            res,
            res
        );

        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position as THREE.BufferAttribute;

        if (heightField) {
            for (let z = 0; z <= res; z++) {
                for (let x = 0; x <= res; x++) {
                    const i = z * (res + 1) + x;
                    pos.setY(i, heightField[i]);
                }
            }
        } else {
            // flat fallback
            for (let i = 0; i < pos.count; i++) {
                pos.setY(i, 0);
            }
        }

        pos.needsUpdate = true;
        geo.computeVertexNormals();

        return geo;
    }, [heightField, resolution, tileSize]);


    if (!geometry) return null;

    const mesh = (
        <mesh
            geometry={geometry}
            position={[worldX + tileSize / 2, 0, worldZ + tileSize / 2]}
        >
            <meshStandardMaterial map={tile.colormap ?? undefined} />
        </mesh>
    );

    const rapierHeightField = useMemo(() => {
        const res = resolution || 32;

        if (heightField) {
            return buildRapierHeightfield(heightField, res);
        }

        // flat fallback collider
        return buildFlatHeightfield(res);
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

/* ---------------------------------------------
   Tile grid (temporary 3×3)
--------------------------------------------- */

export function MapTiles({
    tileSize = 100,
    viewRadius = 2,
    startX = 0,
    startZ = 0,
    endX = 0,
    endZ = 0,
    physics,
}: {
    tileSize?: number;
    viewRadius?: number;
    startX?: number;
    startZ?: number;
    endX?: number;
    endZ?: number;
    physics?: boolean;
}) {
    const { isLoaded } = useMap();

    if (!isLoaded) return null;

    const tiles = [];

    for (let x = startX; x <= endX; x++) {
        for (let z = startZ; z <= endZ; z++) {
            tiles.push(
                <Tile
                    key={`${x},${z}`}
                    tileX={x}
                    tileZ={z}
                    tileSize={tileSize}
                    physics={physics}
                />
            );
        }
    }

    return <>{tiles}</>;
}

function buildRapierHeightfield(
    src: Float32Array,
    res: number
): Float32Array {
    const size = res + 1;
    const out = new Float32Array(size * size);

    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            // Transpose X/Z
            out[x * size + z] = src[z * size + x];
        }
    }

    return out;
}

function buildFlatHeightfield(res: number): Float32Array {
    const size = res + 1;
    return new Float32Array(size * size); // all zeros
}
