"use client";
import * as THREE from 'three'
import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bvh, Instances, Instance, OrbitControls, Environment, useGLTF } from '@react-three/drei'
import { InstancedMeshProvider, useInstanceMeshes } from './InstancedMeshProvider';
import { Perf } from 'r3f-perf';


// Define mesh file paths
const MESH_PATHS = {
    tree: '/models/environment/tree.glb',
    shoe: '/models/environment/shoe.glb',
};

export default function App() {
    // Generate 3 trees and 3 shoes with random positions/rotations and file paths
    const data = [
        ...Array.from({ length: 3 }, () => createInstanceData('tree', MESH_PATHS.tree)),
        ...Array.from({ length: 3 }, () => createInstanceData('shoe', MESH_PATHS.shoe)),
    ];
    // Collect unique mesh options from data
    const meshOptions = Array.from(
        new Map(
            data.map(d => [d.meshPath, { name: d.meshType, path: d.meshPath }])
        ).values()
    );
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas camera={{ position: [0, 0, 20], fov: 50 }}>
                    <Perf />
                    <InstancedMeshProvider meshOptions={meshOptions}>
                        <Bvh firstHitOnly>
                            <Scene data={data} />
                        </Bvh>
                        <Environment preset="city" />
                        <OrbitControls makeDefault />
                    </InstancedMeshProvider>
                    <ambientLight intensity={0.5 * Math.PI} />
                    <directionalLight intensity={0.3} position={[5, 25, 20]} />
                </Canvas>
            </div>
        </div>
    )
}

function createInstanceData(meshType: string, meshPath: string): InstanceData {
    return {
        random: Math.random(),
        position: [
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        ],
        rotation: [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        ],
        meshType,
        meshPath,
    };
}

type InstanceData = {
    random: number;
    position: [number, number, number];
    rotation: [number, number, number];
    meshType: string;
    meshPath: string;
};

interface InstanceProps {
    data: InstanceData[];
}

function Scene({ data }: InstanceProps) {
    const instances = useInstanceMeshes();
    const meshNames = Object.keys(instances);

    // meshType is now assigned in getData
    return (
        <>
            {data.map((props, i) => {
                // Defensive: ensure meshType is defined and a string
                const meshType = typeof props.meshType === 'string' ? props.meshType : '';
                const meshNamesToUse = meshNames.filter((n) =>
                    typeof n === 'string' && meshType && n.toLowerCase().includes(meshType.toLowerCase())
                );
                return (
                    <group key={meshType + '-' + i} position={props.position} rotation={props.rotation}>
                        {meshNamesToUse.map((name) => {
                            const Instance = instances[name];
                            return (
                                <Instance
                                    key={name}
                                    scale={[1, 1, 1]}
                                />
                            );
                        })}
                    </group>
                );
            })}
        </>
    );
}
