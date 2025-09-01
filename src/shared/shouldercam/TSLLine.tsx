import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, useMemo, useCallback, RefObject } from "react";
import { MathUtils, Vector3, Group, PerspectiveCamera, Euler, Quaternion } from "three";

import * as THREE from "three";
import { LineBasicNodeMaterial } from "three/webgpu";



export default function AimLine({ length = 5, container }: { length?: number, container: RefObject<Group | null> }) {

    const { scene } = useThree();

    useEffect(() => {
        const material = new LineBasicNodeMaterial({
            color: 0x0000ff
        });
        const points = [];
        points.push(new THREE.Vector3(-0.2, 0.5, 0));
        points.push(new THREE.Vector3(-0.2, 1, 2));
        points.push(new THREE.Vector3(-0.2, 0, 4));

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        if (container.current) {
            container.current?.add(line);
        }

        return () => {
            if (container.current) {
                container.current.remove(line);
            }
        };
    }, [container]);

    return null;
}