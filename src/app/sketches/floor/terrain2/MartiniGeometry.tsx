import { useMemo, useRef } from "react";
import Martini from "@mapbox/martini";
import { useDetectGPU } from "@react-three/drei";
import * as THREE from "three";

function parseRGBHeightField(image: HTMLImageElement, format = GRAYSCALE) {
    const tileSize = image.width;
    const gridSize = tileSize + 1;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("width", tileSize.toString());
    canvas.setAttribute("height", tileSize.toString());
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Could not get 2D context from canvas.");
    }

    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, tileSize, tileSize).data;
    const terrain = new Float32Array(gridSize * gridSize);

    // decode terrain values
    for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
            const k = (y * tileSize + x) * 4;
            const r = data[k + 0];
            const g = data[k + 1];
            const b = data[k + 2];
            terrain[y * gridSize + x] = format(r, g, b);
        }
    }
    // backfill right and bottom borders
    for (let x = 0; x < gridSize - 1; x++) {
        terrain[gridSize * (gridSize - 1) + x] =
            terrain[gridSize * (gridSize - 2) + x];
    }
    for (let y = 0; y < gridSize; y++) {
        terrain[gridSize * y + gridSize - 1] = terrain[gridSize * y + gridSize - 2];
    }
    return terrain;
}

function RGBA(r: number, g: number, b: number): number {
    return (r * 256 * 256 + g * 256.0 + b) / 10.0 - 10000.0;
}

function GRAYSCALE(r: number, g: number, b: number): number {
    return r * 256;
}

type MartiniGeometryProps = {
    displacementMap: { image: HTMLImageElement };
    error: number;
    mobileError: number;
    args?: [number, number];
};

export default function MartiniGeometry({ displacementMap, error, mobileError, args = undefined }: MartiniGeometryProps) {
    const computedNormals = useRef(false);
    const GPUTier = useDetectGPU();

    const { tileSize, gridSize, tile, data } = useMemo(() => {
        const tileSize = displacementMap.image.width;
        const gridSize = tileSize + 1;
        const data = parseRGBHeightField(displacementMap.image);

        const martini = new Martini(gridSize);
        const tile = martini.createTile(data);

        return {
            tileSize, gridSize, tile, data
        }
    }, [displacementMap])

    // this does block the main thread potentially causing jank
    const { vertices, uv, indices, v } = useMemo(() => {
        const size = args || [tileSize, tileSize];
        const slowGPU = (GPUTier.tier === 0 || GPUTier.isMobile);
        const mesh = tile.getMesh(slowGPU ? mobileError : error);
        const v = mesh.vertices.length;
        const mv = tile.getMesh(0).vertices.length;

        const vertices = new Float32Array((mv / 2) * 3);
        const uv = new Float32Array(mv);

        for (let i = 0; i < mesh.vertices.length / 2; i++) {
            const x = mesh.vertices[i * 2],
                y = mesh.vertices[i * 2 + 1];
            vertices[3 * i + 0] = (x - tileSize / 2) / tileSize * size[0];
            vertices[3 * i + 1] = (y - tileSize / 2) / tileSize * size[1];
            // vertices[3 * i + 2] = data[y * gridSize + x] / tileSize;
            vertices[3 * i + 2] = 0;

            uv[2 * i + 0] = x / tileSize;
            uv[2 * i + 1] = y / tileSize;
        }

        return {
            vertices,
            uv,
            v,
            indices: mesh.triangles.reverse(),
        };
    }, [tile, data, error, mobileError, args]);

    return (
        <bufferGeometry
            ref={(geo) => {
                if (geo) {
                    geo.attributes.position.needsUpdate = true;
                    geo.attributes.uv.needsUpdate = true;
                    // Create a new BufferAttribute for uv2 using the same array as uv
                    // @ts-expect-error sucks
                    geo.setAttribute('uv2', geo.attributes.uv.array ? new THREE.BufferAttribute(geo.attributes.uv.array, 2) : geo.attributes.uv.clone());
                    if (geo.index) {
                        geo.index.needsUpdate = true;
                    }
                    if (computedNormals.current) return;
                    geo.computeVertexNormals();
                    computedNormals.current = true;
                }
            }}
        >
            <bufferAttribute
                attach="attributes-position"
                array={vertices}
                count={vertices.length / 3}
                itemSize={3}
                args={[vertices, 3]}
            />
            <bufferAttribute
                // attach="attributes-color"
                attach="attributes-uv"
                array={uv}
                count={uv.length / 2}
                itemSize={2}
                args={[uv, 2]}
            />
            <bufferAttribute
                attach="index"
                array={indices}
                count={indices.length}
                itemSize={1}
                args={[indices, 1]}
            />
        </bufferGeometry>
    );
}

