import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

interface CarProps {
    points: THREE.Vector3[];
    tangents: THREE.Vector3[];
    normals: THREE.Vector3[];
    binormals: THREE.Vector3[];
    speed: number;
    children: React.ReactNode;
}

export function Car({ points, tangents, normals, binormals, speed, children }: CarProps) {
    const carRef = useRef<THREE.Group>(null);
    const i = useRef(0);


    useFrame((state, delta) => {
        if (!points.length || !tangents.length || !normals.length || !binormals.length || !carRef.current) return;

        i.current += speed * delta * 60;
        i.current %= points.length;

        const index = Math.floor(i.current);
        const frac = i.current - index;
        const nextIndex = (index + 1) % points.length;

        // Interpolate position
        const pos1 = points[index];
        const pos2 = points[nextIndex];
        carRef.current.position.lerpVectors(pos1, pos2, frac);

        // Interpolate rotation
        const matrix1 = new THREE.Matrix3();
        matrix1.set(
            normals[index].x, binormals[index].x, -tangents[index].x,
            normals[index].y, binormals[index].y, -tangents[index].y,
            normals[index].z, binormals[index].z, -tangents[index].z
        );
        const matrix2 = new THREE.Matrix3();
        matrix2.set(
            normals[nextIndex].x, binormals[nextIndex].x, -tangents[nextIndex].x,
            normals[nextIndex].y, binormals[nextIndex].y, -tangents[nextIndex].y,
            normals[nextIndex].z, binormals[nextIndex].z, -tangents[nextIndex].z
        );

        const quat1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().setFromMatrix3(matrix1));
        const quat2 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().setFromMatrix3(matrix2));
        const interpolatedQuat = quat1.clone().slerp(quat2, frac);

        carRef.current.setRotationFromQuaternion(interpolatedQuat);
    });

    return (
        <group ref={carRef}>
            {children}
        </group>
    );
}