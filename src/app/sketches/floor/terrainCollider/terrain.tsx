import { HeightfieldCollider, RigidBody, InstancedRigidBodies } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Instances, Instance } from "@react-three/drei";
// import { Tree } from "./Tree.tsx";

// Component to render small rigidbody boxes at each vertex
function VertexVisualizer({ geometry }: { geometry: THREE.PlaneGeometry }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    // Gather vertex positions
    const instances = useMemo(() => {
        const arr: {
            key: string;
            position: [number, number, number];
            rotation: [number, number, number];
        }[] = [];
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            arr.push({
                key: "vertex_" + i,
                position: [pos[i], pos[i + 1] + 2.5, pos[i + 2]] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
            });
        }
        return arr;
    }, [geometry]);

    return (
        <InstancedRigidBodies instances={instances} type="dynamic" colliders="cuboid">
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, instances.length]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshStandardMaterial color="red" />
            </instancedMesh>
        </InstancedRigidBodies>
    );
}

export function Terrain({ onClick }: { onClick?: (coords: number[]) => void }) {
    const width = 30;
    const height = 30;
    const tileSize = 4; // New tile size
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
        const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);

        heightField.forEach((v, index) => {
            (geometry.attributes.position.array as THREE.TypedArray)[index * 3 + 2] = v - 0.2;
        });
        geometry.scale(-1, 1, 1);
        geometry.rotateX(Math.PI / 2);
        geometry.rotateY(Math.PI / 2);
        geometry.rotateZ(-Math.PI);
        geometry.computeVertexNormals();

        return geometry;
    }, [heightField]);

    const geometry2 = new THREE.PlaneGeometry(100, 100);
    geometry2.rotateX(-Math.PI / 2);

    const [treePositions, treeScales] = useMemo(() => {
        const positions = [];
        const scales = [];

        for (let i = 0; i < 100; i++) {
            positions.push([
                (Math.random() - 0.5) * height,
                0,
                (Math.random() - 0.5) * width,
            ]);
            scales.push([
                Math.max(0.8, Math.random()),
                Math.max(0.7, Math.random()),
                Math.max(0.8, Math.random()),
            ]);
        }

        return [positions, scales];
    }, []);

    return (
        <>
            <RigidBody colliders={false} position={[0, 0, 0]}>
                <mesh
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
                    <meshStandardMaterial
                        color="limegreen"
                        side={THREE.DoubleSide}
                        shadowSide={THREE.DoubleSide}
                    />
                </mesh>

                <HeightfieldCollider
                    args={[
                        widthSegments,
                        heightSegments,
                        heightField as number[],
                        { x: height, y: 1, z: width },
                    ]}
                />
            </RigidBody>

            {/* Add the vertex visualizer */}
            <VertexVisualizer geometry={geometry} />
        </>
    );
}