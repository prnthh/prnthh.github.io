"use client";

import { useMapEditor } from "./MapEditorProvider";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export default function SynchronizedPointer() {
    const { brush, isDrawing, pointerRef } = useMapEditor();
    const groupRef = useRef<THREE.Group>(null);

    // Update group position directly from ref without triggering re-renders
    useFrame(() => {
        if (!groupRef.current) return;

        if (!pointerRef.current) {
            groupRef.current.visible = false;
            return;
        }

        const [x, y, z] = pointerRef.current;
        groupRef.current.visible = true;
        groupRef.current.position.set(x, y, z);
    });

    return (
        <group ref={groupRef} visible={false}>
            <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[brush.size * 0.8, brush.size, 32]} />
                <meshBasicMaterial
                    color={isDrawing ? "yellow" : "cyan"}
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <mesh position={[0, 0.2, 0]}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial
                    color={isDrawing ? "orange" : "blue"}
                    transparent
                    opacity={0.7}
                />
            </mesh>
        </group>
    );
}
