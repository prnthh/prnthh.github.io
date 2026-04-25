"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import {
    bufferAttribute,
    clamp,
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

type Vec3NodeLike = ReturnType<typeof vec3>;

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

                // right
                positions.push(w, y, 0);
                centers.push(cx, 0, cz);
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

        const bladeCenterAttribute = geometry.getAttribute("bladeCenter") as THREE.BufferAttribute | undefined;

        if (!bladeCenterAttribute) {
            return mat;
        }

        mat.positionNode = (() => {
            const local = positionLocal;
            const center = bufferAttribute(bladeCenterAttribute, "vec3") as unknown as Vec3NodeLike;
            const centerXZ = vec2(center.x, center.z);
            const half = uFieldSize.mul(0.5);
            const wrappedXZ = centerXZ
                .add(uCameraXZ)
                .add(half)
                .mod(uFieldSize)
                .sub(half);
            const bend = clamp(local.y.mul(4), 0, 1);
            const wind = sin(
                wrappedXZ.x.mul(0.15)
                    .add(wrappedXZ.y.mul(0.12))
                    .add(uTime.mul(1.5))
            ).mul(0.15).mul(bend);

            return vec3(
                wrappedXZ.x.add(local.x).add(wind),
                local.y,
                wrappedXZ.y.add(local.z).add(wind)
            );

        })();

        return mat;
    }, [geometry, uCameraXZ, uFieldSize, uTime]);

    /* ---------------------------------- */
    /* per-frame updates */
    /* ---------------------------------- */

    useFrame((_, dt) => {
        uTime.value += dt;
        uCameraXZ.value.set(camera.position.x, camera.position.z);
    });

    return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
