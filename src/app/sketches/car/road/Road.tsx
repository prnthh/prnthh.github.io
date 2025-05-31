import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';

export function Road() {
    // Refs for animation state
    const points = useRef<THREE.Vector3[]>([]);
    const tangents = useRef<THREE.Vector3[]>([]);
    const normals = useRef<THREE.Vector3[]>([]);
    const binormals = useRef<THREE.Vector3[]>([]);
    const iBlue = useRef(0);
    const iRed = useRef(1400);

    // Flatten array of points for easier handling
    const curvePoints = [
        -6, 0, 10, -1, 0, 10, 3, 0, 4, 6, 0, 1, 11, 0, 2,
        13, 0, 6, 9, 1, 9, 4, 1, 7, 1, 1, 1, 0, 1, -5,
        2, 0, -9, 8, 0, -10, 13, 0, -5, 14, 1, 2, 10, 3, 7,
        2, 1, 8, -4, 3, 7, -8, 1, 1, -9, 1, -4, -6, 1, -9,
        0, 1, -10, 7, 1, -7, 5, 2, 0, 0, 2, 2, -5, 1, 0,
        -7, 2, -5, -8, 2, -9, -11, 2, -10, -14, 1, -7,
        -13, 1, -2, -14, 0, 3, -11, 0, 10, -6, 0, 10
    ];

    const pts = useMemo(() => {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < curvePoints.length; i += 3) {
            points.push(new THREE.Vector3(curvePoints[i], curvePoints[i + 1], curvePoints[i + 2]));
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

    // Cars
    const blueCarRef = useRef<THREE.Mesh>(null);
    const redCarRef = useRef<THREE.Mesh>(null);
    const blueCarGLTF = useGLTF('/models/rigga.glb');
    const redCarGLTF = useGLTF('/models/rigga2.glb');
    const [blueCarScene, setBlueCarScene] = useState<THREE.Object3D | null>(null);
    const [redCarScene, setRedCarScene] = useState<THREE.Object3D | null>(null);

    useEffect(() => {
        if (blueCarGLTF && blueCarGLTF.scene) {
            const carScene = blueCarGLTF.scene.clone();
            carScene.rotation.y = Math.PI;
            carScene.scale.set(0.0015, 0.0015, 0.0015);
            setBlueCarScene(carScene);
        }
        if (redCarGLTF && redCarGLTF.scene) {
            const carScene = redCarGLTF.scene.clone();
            const box = new THREE.Box3().setFromObject(carScene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            carScene.position.set(
                -center.x - 0.3,
                size.y / 2 - center.y,
                -center.z + 2.2
            );
            carScene.rotation.y = Math.PI / 2;
            carScene.scale.set(0.4, 0.4, 0.4);
            setRedCarScene(carScene);
        }
    }, [blueCarGLTF, redCarGLTF]);

    useFrame(() => {
        if (!points.current.length ||
            !tangents.current.length || !normals.current.length || !binormals.current.length) return;

        if (iBlue.current === lss) iBlue.current = 0;
        if (iRed.current === -1) iRed.current = ls;

        // Update cars position and rotation
        const matrix3 = new THREE.Matrix3();
        const matrix4 = new THREE.Matrix4();

        // Blue car
        matrix3.set(
            tangents.current[iBlue.current].x, binormals.current[iBlue.current].x, normals.current[iBlue.current].x,
            tangents.current[iBlue.current].y, binormals.current[iBlue.current].y, normals.current[iBlue.current].y,
            tangents.current[iBlue.current].z, binormals.current[iBlue.current].z, normals.current[iBlue.current].z
        );
        matrix4.setFromMatrix3(matrix3);
        if (blueCarRef.current) {
            blueCarRef.current.setRotationFromMatrix(matrix4);
            blueCarRef.current.position.set(
                points.current[iBlue.current].x + 0.18 * normals.current[iBlue.current].x,
                points.current[iBlue.current].y,
                points.current[iBlue.current].z + 0.18 * normals.current[iBlue.current].z
            );
        }
        iBlue.current++;

        // Red car
        matrix3.set(
            tangents.current[iRed.current].x, binormals.current[iRed.current].x, normals.current[iRed.current].x,
            tangents.current[iRed.current].y, binormals.current[iRed.current].y, normals.current[iRed.current].y,
            tangents.current[iRed.current].z, binormals.current[iRed.current].z, normals.current[iRed.current].z
        );
        matrix4.setFromMatrix3(matrix3);
        if (redCarRef.current) {
            redCarRef.current.setRotationFromMatrix(matrix4);
            redCarRef.current.position.set(
                points.current[iRed.current].x - 0.18 * normals.current[iRed.current].x,
                points.current[iRed.current].y,
                points.current[iRed.current].z - 0.18 * normals.current[iRed.current].z
            );
        }
        iRed.current--;
    });

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
            <gridHelper args={[30, 30]} />

            <mesh geometry={geometry} material={roadMaterial} receiveShadow castShadow />

            {/* Cars */}
            {blueCarScene && (
                <group ref={blueCarRef} >
                    <primitive object={blueCarGLTF.scene} />
                </group>
            )}
            {redCarScene && (
                <group ref={redCarRef}>
                    <primitive object={redCarGLTF.scene} />
                </group>
            )}
        </>
    );
}