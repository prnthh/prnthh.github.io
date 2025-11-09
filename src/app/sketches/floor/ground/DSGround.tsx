import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import DetailedMaterial from "@/shared/shaders/floor/DetailedMaterial";
import { ThreeEvent } from "@react-three/fiber";
// import { Tree } from "./Tree.tsx";


export function DSGround({ position = [0, 0, 0], onClick }: { position: [number, number, number], onClick?: (event: ThreeEvent<MouseEvent>) => void }) {
    const width = 32;
    const height = 32;
    const tileSize = 4; // New tile size
    const widthSegments = Math.floor(width / tileSize / 2); // Halved resolution
    const heightSegments = Math.floor(height / tileSize / 2); // Halved resolution

    // Low-res height map (for collider and as base for HD mesh)
    const lowResWidthSegments = widthSegments;
    const lowResHeightSegments = heightSegments;
    const lowResHeights = useMemo(() => {
        const arr = new Array((lowResWidthSegments + 1) * (lowResHeightSegments + 1));
        for (let h = 0; h <= lowResHeightSegments; h++) {
            for (let w = 0; w <= lowResWidthSegments; w++) {
                // Example: procedural height, replace with your own logic
                arr[h * (lowResWidthSegments + 1) + w] = ((h + w) % 5) * Math.random() * 3;
            }
        }
        return arr;
    }, []);

    // HD mesh height map by bilinear interpolation from low-res
    const meshWidthSegments = 512; // Halved resolution
    const meshHeightSegments = 512; // Halved resolution
    const meshHeights = useMemo(() => {
        const arr = new Array((meshWidthSegments + 1) * (meshHeightSegments + 1));
        for (let h = 0; h <= meshHeightSegments; h++) {
            for (let w = 0; w <= meshWidthSegments; w++) {
                // Map (w, h) to low-res coordinates
                const fx = (w / meshWidthSegments) * lowResWidthSegments;
                const fz = (h / meshHeightSegments) * lowResHeightSegments;
                const x0 = Math.floor(fx);
                const x1 = Math.min(x0 + 1, lowResWidthSegments);
                const z0 = Math.floor(fz);
                const z1 = Math.min(z0 + 1, lowResHeightSegments);
                const sx = fx - x0;
                const sz = fz - z0;
                const i00 = z0 * (lowResWidthSegments + 1) + x0;
                const i10 = z0 * (lowResWidthSegments + 1) + x1;
                const i01 = z1 * (lowResWidthSegments + 1) + x0;
                const i11 = z1 * (lowResWidthSegments + 1) + x1;
                const h00 = lowResHeights[i00] || 0;
                const h10 = lowResHeights[i10] || 0;
                const h01 = lowResHeights[i01] || 0;
                const h11 = lowResHeights[i11] || 0;
                // Bilinear interpolation
                const h0 = h00 * (1 - sx) + h10 * sx;
                const h1 = h01 * (1 - sx) + h11 * sx;
                const height = h0 * (1 - sz) + h1 * sz;
                arr[h * (meshWidthSegments + 1) + w] = height;
            }
        }
        return arr;
    }, [lowResHeights]);

    // Collider uses the low-res height map
    const heightField = lowResHeights;

    const geometry = useMemo(() => {
        const geometry = new THREE.PlaneGeometry(width, height, meshWidthSegments, meshHeightSegments);
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setZ(i, meshHeights[i]);
        }
        geometry.computeVertexNormals();
        return geometry;
    }, [meshHeights]);

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

    // Load textures
    const textures = useTexture({
        map: '/textures/floor/rocks/gray_rocks_diff_1k.jpg',
        displacementMap: '/textures/floor/rocks/gray_rocks_disp_1k.png',
        normalMap: '/textures/floor/rocks/gray_rocks_nor_gl_1k.jpg',
        roughnessMap: '/textures/floor/rocks/gray_rocks_rough_1k.jpg',
    });

    useEffect(() => {
        Object.values(textures).forEach((tex: any) => {
            if (tex) {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.repeat?.set(7, 9); // Lowered tiling for visible displacement
                tex.anisotropy = 16;
                tex.needsUpdate = true;
            }
        });
    }, [textures]);

    return (
        <>
            <RigidBody colliders={false}>
                <mesh
                    position={position}
                    geometry={geometry}
                    rotation={[-Math.PI / 2, 0, 0]}
                    onClick={onClick}
                >
                    <DetailedMaterial />
                </mesh>

                <HeightfieldCollider
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