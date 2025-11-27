import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import { PlaneGeometry, TypedArray } from "three";

function ColliderTerrain({ size = [32, 32], position = [0, 0, 0], onClick, children }: { size?: [number, number], position?: [number, number, number], onClick?: (coords: number[]) => void, children?: React.ReactNode }) {
    const width = size[0];
    const height = size[1];
    const tileSize = 4;
    const widthSegments = Math.floor(width / tileSize);
    const heightSegments = Math.floor(height / tileSize);

    const heightField = useMemo(() => {
        const heightField = Array((widthSegments + 1) * (heightSegments + 1)).fill(0);

        for (let h = 0; h < heightSegments + 1; h++) {
            for (let w = 0; w < widthSegments + 1; w++) {
                const i = h * (widthSegments + 1) + w; // Fix array indexing
                heightField[i] = ((h + w) % 5) * Math.random() * 0.3 * 3;
            }
        }

        return heightField;
    }, []);

    const geometry = useMemo(() => {
        const geometry = new PlaneGeometry(width, height, widthSegments, heightSegments);

        heightField.forEach((v, index) => {
            (geometry.attributes.position.array as TypedArray)[index * 3 + 2] = v; // height offset of collider from mesh
        });
        geometry.computeVertexNormals();

        return geometry;
    }, [heightField]);

    return (
        <>
            <RigidBody colliders={false} >
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    scale={[-1, 1, 1]}
                    position={position}
                    geometry={geometry}
                    castShadow
                    receiveShadow
                    onClick={e => {
                        if (onClick) {
                            // Get intersection point in world coordinates
                            const point = e.point;
                            onClick([point.x, point.y, point.z]);
                        }
                    }}
                >
                    {children || <meshStandardMaterial
                        color="limegreen"
                    />}
                </mesh>

                <HeightfieldCollider
                    rotation={[0, -Math.PI / 2, 0]}
                    position={position}
                    args={[
                        widthSegments,
                        heightSegments,
                        heightField as number[],
                        { x: height, y: 1, z: width },
                    ]}
                />
            </RigidBody>
        </>
    );
}

export default ColliderTerrain;