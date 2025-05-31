"use client";

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Csm } from './Csm'
import React, { RefObject, useRef } from 'react'
import * as THREE from 'three'

export default function App() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows>
                    <Csm lightDirection={[10, 10, 5]}>
                        <ambientLight intensity={0.5} />
                        <directionalLight intensity={1} position={[10, 10, 5]} />
                        <Box position={[1.2, 2, 0]} />
                        <Box position={[1.2, 0, 0]} />
                        <Plane rotation-x={-Math.PI / 2} position={[0, -2, 1]} scale={100} />
                    </Csm>
                    <OrbitControls />
                </Canvas>
            </div>
        </div>
    )
}


function Box(props: any) {
    const ref = useRef<THREE.Mesh>(null)
    useFrame((state: any, delta: number) => {
        if (ref.current) {
            ref.current.rotation.x += delta
            ref.current.rotation.y += delta
        }
    })
    return (
        <mesh {...props} ref={ref as RefObject<THREE.Mesh>} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={'orange'} />
        </mesh>
    )
}

function Plane(props: any) {
    return (
        <mesh {...props} castShadow receiveShadow>
            <planeGeometry />
            <meshStandardMaterial color="white" />
        </mesh>
    )
}

