"use client";

import { Environment, OrbitControls, Stats, useGLTF } from '@react-three/drei';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { extend, useFrame, useLoader } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { FBXLoader } from 'three/examples/jsm/Addons.js';
import { GameCanvas } from '@/shared/GameCanvas';

extend({ InstancedMesh2 });

const MODEL_URL = "/models/human/rigga/rigga2.glb";
const ANIM_URL = "/models/human/anim/run.fbx";
const INSTANCE_COUNT = 100;

function SimpleInstances() {
    const { scene: modelScene } = useGLTF(MODEL_URL);
    const animations = useLoader(FBXLoader, ANIM_URL);
    const instancedMeshRef = useRef<InstancedMesh2>(null);
    const mixer = useRef<THREE.AnimationMixer | null>(null);
    const action = useRef<THREE.AnimationAction | null>(null);
    const totalTime = useRef(0);

    const skinnedMesh = useMemo<THREE.SkinnedMesh | null>(() => {
        let found: THREE.SkinnedMesh | null = null;
        modelScene.traverse((child) => {
            if ((child as THREE.SkinnedMesh).isSkinnedMesh && !found) {
                found = child as THREE.SkinnedMesh;
            }
        });
        return found;
    }, [modelScene]);

    const geometry = useMemo(() => skinnedMesh?.geometry, [skinnedMesh]);
    const material = useMemo(() => skinnedMesh?.material, [skinnedMesh]);

    type InstancedEntityWithOffset = InstanceType<typeof InstancedMesh2>["instances"][number] & { offset?: number };

    useEffect(() => {
        if (!instancedMeshRef.current || !skinnedMesh || !animations.animations?.length) return;

        mixer.current = new THREE.AnimationMixer(skinnedMesh);
        action.current = mixer.current.clipAction(animations.animations[0]);
        action.current.play();

        instancedMeshRef.current.addInstances(INSTANCE_COUNT, (instance: InstancedEntityWithOffset, index: number) => {
            const gridSize = Math.ceil(Math.sqrt(INSTANCE_COUNT));
            const x = (index % gridSize) * 2 - gridSize;
            const z = Math.floor(index / gridSize) * 2 - gridSize;
            instance.position.set(x, 0, z);
            instance.offset = Math.random() * 2;
        });

        instancedMeshRef.current.initSkeleton(skinnedMesh.skeleton);

        for (const instance of instancedMeshRef.current.instances as InstancedEntityWithOffset[]) {
            mixer.current.setTime(instance.offset ?? 0);
            instance.updateBones();
        }
    }, [skinnedMesh, animations]);

    useFrame((_, delta) => {
        if (!instancedMeshRef.current || !mixer.current || !action.current) return;
        totalTime.current += delta;

        for (const instance of instancedMeshRef.current.instances as InstancedEntityWithOffset[]) {
            mixer.current.setTime(totalTime.current + (instance.offset ?? 0));
            instance.updateBones();
        }
    });

    if (!geometry || !material) return null;

    return (
        <instancedMesh2
            ref={instancedMeshRef}
            args={[geometry, material, { createEntities: true }]}
            castShadow
            receiveShadow
        />
    );
}

export default function Page() {
    return (
        <div className="h-screen">
            <GameCanvas shadows camera={{ position: [5, 5, 5], fov: 75 }}>
                <Physics>
                    <directionalLight position={[4, 4, 4]} castShadow intensity={2} />
                    <ambientLight intensity={1.5} />
                    <fog attach="fog" args={[0x99ddff, 50, 100]} />
                    <SimpleInstances />
                    <Environment preset="sunset" background />
                    <OrbitControls />
                </Physics>
                <Stats className="!left-auto right-0" />
            </GameCanvas>
        </div>
    );
}