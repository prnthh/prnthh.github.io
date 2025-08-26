"use client";

import { Environment, OrbitControls, Stats, useGLTF } from '@react-three/drei';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import * as THREE from 'three';
import React, { useEffect, useMemo, useRef } from 'react';
import { extend, useFrame, useLoader } from '@react-three/fiber';
import { CapsuleCollider, InstancedRigidBodies, Physics, RigidBody } from '@react-three/rapier';
import { FBXLoader } from 'three/examples/jsm/Addons.js';
import { GameCanvas } from '@/shared/GameCanvas';

extend({ InstancedMesh2 });

function ModelInstance(props: { url: string; animation?: string; position: [number, number, number]; rotation: [number, number, number] }) {
    return null;
}

function InstanceProvider({ children }: { children: React.ReactNode }) {
    const models = useMemo(() => {
        const mapped = React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
                return child.props;
            }
        });
        return mapped ? mapped.filter(Boolean) : [];
    }, [children]);

    // Group models by URL and pass the correct instances array
    const objectsByUrl = useMemo(() => {
        const grouped: Record<string, { url: string; animation?: string; instances: any[] }> = {};
        for (const child of models) {
            const modelChild = child as { url: string; animation?: string; position: [number, number, number]; rotation: [number, number, number] };
            if (!grouped[modelChild.url]) {
                grouped[modelChild.url] = { url: modelChild.url, animation: modelChild.animation, instances: [] };
            }
            grouped[modelChild.url].instances.push({
                key: modelChild.url + grouped[modelChild.url].instances.length,
                position: modelChild.position,
                rotation: modelChild.rotation,
            });
        }
        return grouped;
    }, [models]);

    return (
        <>
            {Object.values(objectsByUrl).map((obj) => (
                <InstancesOfType key={obj.url} url={obj.url} instances={obj.instances} animation={obj.animation} />
            ))}
        </>
    );
}

type InstancesOfTypeProps = {
    url: string;
    instances: any[];
    animation?: string;
};

const InstancesOfType = ({ url, instances, animation }: InstancesOfTypeProps) => {
    const { scene } = useGLTF(url);
    const instancedMeshRef = useRef<InstancedMesh2>(null);
    const ref = useRef(null);

    // Dynamically find geometry and material from the first mesh or skinned mesh
    const mesh = useMemo<THREE.Mesh | null>(() => {
        let found: THREE.Mesh | null = null;
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && !found) {
                found = child as THREE.Mesh;
            }
        });
        return found;
    }, [scene]);

    const geometry = mesh?.geometry;
    const material = mesh?.material;

    // Animation logic (only if animation prop is provided)
    const skinnedMesh = useMemo<THREE.SkinnedMesh | null>(() => {
        let found: THREE.SkinnedMesh | null = null;
        scene.traverse((child) => {
            if ((child as THREE.SkinnedMesh).isSkinnedMesh && !found) {
                found = child as THREE.SkinnedMesh;
            }
        });
        return found;
    }, [scene]);

    const mixer = useRef<THREE.AnimationMixer | null>(null);
    const action = useRef<THREE.AnimationAction | null>(null);
    const totalTime = useRef(0);
    const animations = animation ? useLoader(FBXLoader, animation) : null;

    type InstancedEntityWithOffset = InstanceType<typeof InstancedMesh2>["instances"][number] & { offset?: number };

    useEffect(() => {
        if (instancedMeshRef.current) {
            instancedMeshRef.current.addInstances(instances.length, (obj: InstancedEntityWithOffset, idx: number) => {
                obj.position.y = 20;
                if (animation) obj.offset = Math.random() * 2;
            });
        }
    }, [instances.length, animation]);

    useEffect(() => {
        if (!animation) return;
        if (!instancedMeshRef.current || !skinnedMesh || !animations?.animations?.length) return;

        instancedMeshRef.current.initSkeleton(skinnedMesh.skeleton);
        mixer.current = new THREE.AnimationMixer(skinnedMesh);
        action.current = mixer.current.clipAction(animations.animations[0]);
        action.current?.play();

        for (const instance of instancedMeshRef.current.instances as InstancedEntityWithOffset[]) {
            mixer.current?.setTime(instance.offset ?? 0);
            instance.updateBones();
        }
    }, [skinnedMesh, animations, animation]);

    useFrame((_, delta) => {
        if (!animation) return;
        if (!instancedMeshRef.current || !mixer.current || !action.current) return;
        totalTime.current += delta;
        for (const instance of instancedMeshRef.current.instances as InstancedEntityWithOffset[]) {
            mixer.current.setTime(totalTime.current + (instance.offset ?? 0));
            instance.updateBones();
        }
    });

    if (!geometry || !material) return null;

    return (
        <InstancedRigidBodies
            ref={ref}
            instances={instances}
            lockRotations={true}
            enabledRotations={[true, false, true]}
            colliders={false}
            colliderNodes={[
                <CapsuleCollider args={[0.5, 0.5]} />,
            ]}
            userData={{ ground: true }}
        >
            <instancedMesh2
                key={url}
                ref={instancedMeshRef}
                frustumCulled={false}
                receiveShadow
                castShadow
                args={[geometry, material, { createEntities: true }]}
                dispose={null}
            />
        </InstancedRigidBodies>
    );
}



export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>

                        <InstanceProvider>
                            <ModelInstance url='/models/human/onimilio/rigged.glb' animation="/models/human/anim/run.fbx" position={[0, 5, 1]} rotation={[0, 0, 0]} />
                            <ModelInstance url='/models/human/onimilio/rigged.glb' animation="/models/human/anim/run.fbx" position={[3, 5, 2]} rotation={[0, 0, 0]} />
                            <ModelInstance url='/models/human/onimilio/rigged.glb' animation="/models/human/anim/run.fbx" position={[0, 5, 3]} rotation={[0, 0, 0]} />
                            <ModelInstance url='/coin.glb' position={[1, 5, 1]} rotation={[Math.random(), Math.random(), Math.random()]} />
                            <ModelInstance url='/coin.glb' position={[2, 5, 1]} rotation={[Math.random(), Math.random(), Math.random()]} />
                            <ModelInstance url='/coin.glb' position={[3, 5, 1]} rotation={[Math.random(), Math.random(), Math.random()]} />
                            <ModelInstance url='/coin.glb' position={[4, 5, 1]} rotation={[Math.random(), Math.random(), Math.random()]} />
                        </InstanceProvider>
                        <RigidBody type="fixed">
                            <mesh position={[0, -2, 0]} scale={[100, 0.1, 100]} receiveShadow>
                                <boxGeometry />
                                <meshStandardMaterial color="gray" />
                            </mesh>
                        </RigidBody>

                        <RigidBody>
                            <mesh castShadow>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial color="orange" />
                            </mesh>
                        </RigidBody>
                    </Physics>
                    <ambientLight intensity={2} />
                    <OrbitControls />
                </GameCanvas>
            </div>
        </div>
    );
}