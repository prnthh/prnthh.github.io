"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import {
    attribute,
    positionLocal,
    sin,
    uniform,
    vec2,
    vec3,
} from "three/tsl";

type GrassProps = {
    bladeCount?: number;
    fieldSize?: number;
    segments?: number;
};

export function Grass({
    bladeCount = 250_000,
    fieldSize = 200,
    segments = 3,
}: GrassProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();

    /* ---------------------------------- */
    /* uniforms */
    /* ---------------------------------- */

    const uCameraXZ = useMemo(() => uniform(vec2()), []);
    const uTime = useMemo(() => uniform(0), []);
    const uFieldSize = useMemo(() => uniform(fieldSize), [fieldSize]);

    /* ---------------------------------- */
    /* geometry */
    /* ---------------------------------- */

    const geometry = useMemo(() => {
        const positions: number[] = [];
        const centers: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        let v = 0;

        for (let i = 0; i < bladeCount; i++) {
            const cx = (Math.random() - 0.5) * fieldSize;
            const cz = (Math.random() - 0.5) * fieldSize;

            const height = 0.2 + Math.random() * 0.1;
            const width = 0.03;

            for (let s = 0; s <= segments; s++) {
                const t = s / segments;
                const y = height * t;
                const w = width * (1 - t);

                // left
                positions.push(-w, y, 0);
                centers.push(cx, 0, cz);
                uvs.push(0, t);

                // right
                positions.push(w, y, 0);
                centers.push(cx, 0, cz);
                uvs.push(1, t);
            }

            for (let s = 0; s < segments; s++) {
                const i0 = v + s * 2;
                const i1 = i0 + 1;
                const i2 = i0 + 2;
                const i3 = i0 + 3;

                indices.push(i0, i2, i1);
                indices.push(i2, i3, i1);
            }

            v += (segments + 1) * 2;
        }

        const g = new THREE.BufferGeometry();
        g.setIndex(indices);
        g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        g.setAttribute(
            "bladeCenter",
            new THREE.Float32BufferAttribute(centers, 3)
        );
        g.setAttribute("bladeUV", new THREE.Float32BufferAttribute(uvs, 2));

        g.computeBoundingSphere();
        return g;
    }, [bladeCount, fieldSize, segments]);

    /* ---------------------------------- */
    /* material (TSL) */
    /* ---------------------------------- */

    const material = useMemo(() => {
        const mat = new THREE.MeshBasicNodeMaterial({
            color: "#4caf50",
            side: THREE.DoubleSide,
        });

        mat.positionNode = (() => {
            const local = positionLocal;
            const center = attribute("bladeCenter", "vec3");
            const uv = attribute("bladeUV", "vec2");

            const half = uFieldSize.mul(0.5);

            // camera-relative infinite wrap
            const wrappedXZ = center.xz
                .add(uCameraXZ)
                .add(half)
                .mod(uFieldSize)
                .sub(half);

            // wind
            const wind =
                sin(
                    wrappedXZ.x.mul(0.15)
                        .add(wrappedXZ.y.mul(0.12))
                        .add(uTime.mul(1.5))
                ).mul(0.15);

            const sway = vec3(
                wind.mul(uv.y),
                0,
                wind.mul(uv.y)
            );
            const x = wrappedXZ.x.add(local.x).add(sway.x);
            const z = wrappedXZ.y.add(local.z).add(sway.z);

            return vec3(x, local.y, z);

        })();

        return mat;
    }, [uCameraXZ, uFieldSize, uTime]);

    /* ---------------------------------- */
    /* per-frame updates */
    /* ---------------------------------- */

    useFrame((_, dt) => {
        uTime.value += dt;
        uCameraXZ.value.set(camera.position.x, camera.position.z);
    });

    return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
