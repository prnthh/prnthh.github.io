"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls, Sky } from "@react-three/drei";
import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RagdollR3F } from "./RagdollR3F";
import * as THREE from "three";

export default function Home() {

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
                    <Physics debug>
                        <RagdollR3F />
                        <RigidBody type="fixed">
                            <mesh position={[0, -2, 0]} scale={[20, 0.1, 20]} receiveShadow>
                                <boxGeometry />
                                <meshStandardMaterial color="gray" />
                            </mesh>
                        </RigidBody>
                        <Sky sunPosition={new THREE.Vector3(100, 10, 100)} />
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} castShadow intensity={50} />
                        <OrbitControls target={[0, 0, 0]} />
                    </Physics>
                </Canvas>
            </div>
        </div>
    );
}
