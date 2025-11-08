import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { generateHeight, generateTexture } from "@/shared/util";

export function Terrain({ onClick }: { onClick?: (coords: number[]) => void }) {
    // Match the demo's dimensions
    const worldWidth = 256;
    const worldDepth = 256;

    // References for raycasting
    const terrainRef = useRef<THREE.Mesh>(null);
    const { camera, gl, scene } = useThree();

    useEffect(() => {
        if (camera) {
            camera.far = 100000;
            camera.updateProjectionMatrix();
        }
    }, [scene, camera]);

    const heightData = useMemo(() => {
        return generateHeight(worldWidth, worldDepth);
    }, []);

    const terrainTexture = useMemo(() => {
        return generateTexture(heightData, worldWidth, worldDepth);
    }, [heightData]);

    const geometry = useMemo(() => {
        // Create terrain geometry with dimensions matching the demo
        const geometry = new THREE.PlaneGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
            vertices[j + 1] = heightData[i] * 10; // Elevate Y position based on height data
        }

        geometry.computeVertexNormals();
        return geometry;
    }, [heightData]);

    return (
        <>
            <mesh
                ref={terrainRef}
                geometry={geometry}
                onClick={e => {
                    if (onClick) {
                        // Get intersection point in world coordinates
                        const point = e.point;
                        onClick([point.x, point.y, point.z]);
                    }
                }}
            >
                {terrainTexture ? (
                    <meshBasicMaterial
                        map={terrainTexture}
                    />
                ) : (
                    <meshBasicMaterial
                        color="green"
                    />
                )}
            </mesh>
        </>
    );
}

// Terrain engine
// uses height-map images (grey-scale)
// Terrain is built in a WebWorker in tiles, only visible tiles are built so the size of the terrain has very little impact on the load times
// Only visible terrain tiles are being rendered, so run-time performance is independent of the terrain size
// Automatically built ambient occlusion map
