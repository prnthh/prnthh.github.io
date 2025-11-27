import { useMemo } from "react";
import { generateHeight, generateTexture } from "@/shared/util";
import { PlaneGeometry } from "three";

export function ShadedGround({ size = [256, 256], position = [0, 0, 0], onClick }: { size?: [number, number], position?: [number, number, number], onClick?: (coords: number[]) => void }) {
    const worldWidth = size[0];
    const worldDepth = size[1];
    const tileSize = 1;

    const heightData = useMemo(() => {
        return generateHeight(worldWidth, worldDepth, 1);
    }, []);

    const terrainTexture = useMemo(() => {
        return generateTexture(heightData, worldWidth, worldDepth);
    }, [heightData]);

    const geometry = useMemo(() => {
        // Create terrain geometry with dimensions matching the demo
        const geometry = new PlaneGeometry(worldWidth / tileSize, worldDepth / tileSize, worldWidth - 1, worldDepth - 1);
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
            vertices[j + 1] = heightData[i]; // Elevate Y position based on height data
        }

        geometry.computeVertexNormals();
        return geometry;
    }, [heightData]);

    return (
        <>
            <mesh
                position={position}
                geometry={geometry}
                onClick={e => {
                    if (onClick) {
                        // Get intersection point in world coordinates
                        const point = e.point;
                        onClick([point.x, point.y, point.z]);
                    }
                }}
            >
                <meshBasicMaterial
                    map={terrainTexture}
                />

            </mesh>
        </>
    );
}

export default ShadedGround;