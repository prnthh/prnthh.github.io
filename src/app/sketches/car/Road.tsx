import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Box, useGLTF, useTexture } from '@react-three/drei';

export function Road({ curvePoints = sampleCurve, onData, debug = false }: {
    curvePoints?: number[][],
    onData?: (data: { points: THREE.Vector3[], tangents: THREE.Vector3[], normals: THREE.Vector3[], binormals: THREE.Vector3[], }) => void,
    debug?: boolean
}) {

    // Refs for animation state
    const points = useRef<THREE.Vector3[]>([]);
    const tangents = useRef<THREE.Vector3[]>([]);
    const normals = useRef<THREE.Vector3[]>([]);
    const binormals = useRef<THREE.Vector3[]>([]);


    const pts = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < curvePoints.length; i++) {
            points.push(new THREE.Vector3(curvePoints[i][0], curvePoints[i][1], curvePoints[i][2]));
        }
        return points;
    }, []);

    const curve = useMemo(() => new THREE.CatmullRomCurve3(pts), [pts]);

    // Road geometry parameters
    const ls = 1400; // length segments
    const ws = 5; // width segments
    const lss = ls + 1;
    const wss = ws + 1;

    const { geometry, indices, uvs } = useMemo(() => {
        points.current = curve.getPoints(ls);
        const len = curve.getLength();
        const lenList = curve.getLengths(ls);

        const vertices = new Float32Array(lss * wss * 3);
        const uvs = new Float32Array(lss * wss * 2);
        const indices = new Uint32Array(ls * ws * 6);

        // Generate indices
        let idxCount = 0;
        for (let j = 0; j < ls; j++) {
            for (let i = 0; i < ws; i++) {
                const a = wss * j + i;
                const b1 = wss * (j + 1) + i;
                const c1 = wss * (j + 1) + 1 + i;
                const c2 = wss * j + 1 + i;

                indices[idxCount] = a;
                indices[idxCount + 1] = b1;
                indices[idxCount + 2] = c1;
                indices[idxCount + 3] = a;
                indices[idxCount + 4] = c1;
                indices[idxCount + 5] = c2;

                idxCount += 6;
            }
        }

        // Generate UVs
        let uvIdxCount = 0;
        for (let j = 0; j < lss; j++) {
            for (let i = 0; i < wss; i++) {
                uvs[uvIdxCount] = lenList[j] / len;
                uvs[uvIdxCount + 1] = i / ws;
                uvIdxCount += 2;
            }
        }

        // Generate vertices and compute frame
        tangents.current = [];
        normals.current = [];
        binormals.current = [];

        const binormal = new THREE.Vector3(0, 1, 0);

        for (let j = 0; j < lss; j++) {
            const t = curve.getTangent(j / ls);
            tangents.current.push(t.clone());

            const n = new THREE.Vector3();
            n.crossVectors(t, binormal);
            n.y = 0; // prevent lateral slope
            n.normalize();
            normals.current.push(n.clone());

            const b = new THREE.Vector3();
            b.crossVectors(n, t);
            binormals.current.push(b.clone());
        }

        const dw = [-0.36, -0.34, -0.01, 0.01, 0.34, 0.36];
        let posIdx = 0;

        for (let j = 0; j < lss; j++) {
            for (let i = 0; i < wss; i++) {
                const x = points.current[j].x + dw[i] * normals.current[j].x;
                const y = points.current[j].y;
                const z = points.current[j].z + dw[i] * normals.current[j].z;

                vertices[posIdx] = x;
                vertices[posIdx + 1] = y;
                vertices[posIdx + 2] = z;
                posIdx += 3;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));

        // Set material groups
        for (let i = 0; i < ws; i++) {
            geometry.addGroup(i * ls * 6, ls * 6, i);
        }

        return { geometry, indices, uvs };
    }, [curve, ls, ws, lss, wss]);

    useEffect(() => {
        if (onData) {
            onData({
                points: points.current,
                tangents: tangents.current,
                normals: normals.current,
                binormals: binormals.current,
            });
        }
    }, [onData, points.current, tangents.current, normals.current, binormals.current]);

    // Load and create texture for road
    const roadTexture = useTexture('/textures/road.jpg');
    useEffect(() => {
        if (roadTexture) {
            roadTexture.wrapS = THREE.RepeatWrapping;
            roadTexture.wrapT = THREE.RepeatWrapping;
            // Make the texture loop 50 times along the length of the road
            roadTexture.repeat.set(200, 1);
        }
    }, [roadTexture]);

    // Road material (single material with image texture)
    const roadMaterial = useMemo(() =>
        new THREE.MeshStandardMaterial({ map: roadTexture, side: THREE.DoubleSide }),
        [roadTexture]
    );

    return (
        <>
            {debug && <>
                {Array.from({ length: Math.floor(points.current.length / 10) }, (_, i) => i * 10).map(idx => (
                    <arrowHelper
                        key={idx}
                        args={[
                            tangents.current[idx].clone().multiplyScalar(2),
                            points.current[idx],
                            1,
                            0xff0000
                        ]}
                    />
                ))}
                {curvePoints && curvePoints.map((point, index) => (
                    <Box key={index} args={[0.2, 0.2, 0.2]} position={new THREE.Vector3(point[0], point[1], point[2])} />
                ))}
            </>}
            <mesh geometry={geometry} material={roadMaterial} receiveShadow castShadow />
        </>
    );
}

const sampleCurve = [
    [-6, 0, 10],
    [-1, 0, 10],
    [3, 0, 4],
    [6, 0, 1],
    [11, 0, 2],
    [13, 0, 6],
    [9, 1, 9],
    [4, 1, 7],
    [1, 1, 1],
    [0, 1, -5],
    [2, 0, -9],
    [8, 0, -10],
    [13, 0, -5],
    [14, 1, 2],
    [10, 3, 7],
    [2, 1, 8],
    [-4, 3, 7],
    [-8, 1, 1],
    [-9, 1, -4],
    [-6, 1, -9],
    [0, 1, -10],
    [7, 1, -7],
    [5, 2, 0],
    [0, 2, 2],
    [-5, 1, 0],
    [-7, 2, -5],
    [-8, 2, -9],
    [-11, 2, -10],
    [-14, 1, -7],
    [-13, 1, -2],
    [-14, 0, 3],
    [-11, 0, 10],
    [-6, 0, 10]
];
