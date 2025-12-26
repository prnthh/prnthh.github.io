import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, RefObject } from "react";
import { Vector3, Group } from "three";
import * as THREE from "three";
import { LineBasicNodeMaterial } from "three/webgpu";

interface AimLineProps {
    length?: number;
    container: RefObject<Group | null>;
    hit?: boolean;
    offset?: number;
}

const GREEN = 0x00ff00;
const RED = 0xff0000;

export default function AimLine({ length = 1.5, container, hit = false, offset = 0 }: AimLineProps) {
    const materialRef = useRef<LineBasicNodeMaterial | null>(null);

    useEffect(() => {
        if (!container.current) return;

        const material = new LineBasicNodeMaterial({ color: GREEN });
        materialRef.current = material;

        const points = [new THREE.Vector3(0, 0.5, offset), new THREE.Vector3(0, 0.5, offset + length)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        container.current.add(line);

        return () => {
            container.current?.remove(line);
            geometry.dispose();
            material.dispose();
        };
    }, [container, length, offset]);

    useFrame(() => {
        if (materialRef.current) {
            materialRef.current.color.setHex(hit ? RED : GREEN);
        }
    });

    return null;
}