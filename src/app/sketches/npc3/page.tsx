"use client"
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GameCanvas } from "@/shared/GameCanvas";
import { Physics } from "@react-three/rapier";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { extend } from "@react-three/fiber";
import { Stats } from '@react-three/drei'

// Register InstancedMesh2 with R3F
extend({ InstancedMesh2 });

// Configuration constants
const INSTANCE_COUNT = 100;
const MODEL_URL = "/models/Michelle.glb";

export default function Home() {
    return (
        <div className="h-screen">
            <GameCanvas shadows camera={{ position: [5, 5, 5], fov: 75 }}>
                <Physics>
                    <SceneContent />
                </Physics>
                <Stats className="!left-auto right-0" />
            </GameCanvas>
        </div>
    );
}

const SceneContent = () => {
    return (
        <>
            <directionalLight position={[4, 4, 4]} castShadow intensity={2} />
            <ambientLight intensity={1.5} />
            <fog attach="fog" args={[0x99ddff, 50, 100]} />

            {/* Instanced models */}
            <SimpleInstances />

            <Environment preset="sunset" background />
            <OrbitControls />
        </>
    );
};

const SimpleInstances = () => {
    // Get the model
    const { scene: modelScene } = useGLTF(MODEL_URL);
    const instancedMeshRef = useRef<InstancedMesh2>(null);
    const [isReady, setIsReady] = useState(false);

    // Find the skinned mesh to use as template
    const skinnedMesh = useMemo(() => {
        if (!modelScene) return null;

        let mesh: THREE.SkinnedMesh | null = null;
        modelScene.traverse((child) => {
            if (child.type === 'SkinnedMesh' && !mesh) {
                mesh = child as THREE.SkinnedMesh;
            }
        });
        return mesh;
    }, [modelScene]);

    // Set up instances when the InstancedMesh2 ref is available
    const handleInstancedMeshRef = (mesh: InstancedMesh2 | null) => {
        if (!mesh || !skinnedMesh) return;

        instancedMeshRef.current = mesh;

        // Add instances with random properties
        mesh.addInstances(INSTANCE_COUNT, (instance, index: number) => {
            // Position in a grid with randomization
            const gridSize = Math.ceil(Math.sqrt(INSTANCE_COUNT));
            const x = (index % gridSize) * 2 - gridSize;
            const z = Math.floor(index / gridSize) * 2 - gridSize;

            instance.position.set(
                x + (Math.random() - 0.5) * 1.5,
                0,
                z + (Math.random() - 0.5) * 1.5
            );

            // Random scale
            const scale = 0.8 + Math.random() * 0.4;
            instance.scale.set(scale, scale, scale);
        });

        setIsReady(true);
    };

    if (!skinnedMesh) return null;

    return (
        <primitive
            object={new InstancedMesh2(
                (skinnedMesh as THREE.SkinnedMesh).geometry,
                (skinnedMesh as THREE.SkinnedMesh).material
            )}
            ref={handleInstancedMeshRef}
            castShadow
            receiveShadow
        />
    );
};
