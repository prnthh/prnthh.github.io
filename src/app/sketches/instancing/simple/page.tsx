"use client";
import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bvh, Instances, Instance, OrbitControls, Environment, useGLTF } from '@react-three/drei'

export default function App() {
    const range = 100 // Default value, since Leva is not present
    const data = getData(1000)
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas camera={{ position: [0, 0, 20], fov: 50 }}>
                    <ambientLight intensity={0.5 * Math.PI} />
                    <directionalLight intensity={0.3} position={[5, 25, 20]} />
                    <Bvh firstHitOnly>
                        <Shoes data={data} range={range} />
                    </Bvh>
                    <Environment preset="city" />
                    <OrbitControls autoRotate autoRotateSpeed={1} />
                </Canvas>
            </div>
        </div>
    )
}

// Store data for instancing demo (moved from store.js)
function getData(count = 1000): ShoeData[] {
    return Array.from({ length: count }, () => ({
        random: Math.random(),
        position: [
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        ] as [number, number, number],
        rotation: [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        ] as [number, number, number]
    }))
}

type ShoeData = {
    random: number;
    position: [number, number, number];
    rotation: [number, number, number];
};

interface ShoesProps {
    data: ShoeData[];
    range: number;
}

function Shoes({ data, range }: ShoesProps) {
    const { nodes, materials } = useGLTF('/models/environment/shoe.glb') as any;
    return (
        <Instances range={range} material={materials.phong1SG} geometry={nodes.Shoe.geometry}>
            {data.map((props, i) => (
                <Shoe key={i} {...props} />
            ))}
        </Instances>
    )
}

function Shoe({ random, color = new THREE.Color(), ...props }: ShoeData & { color?: THREE.Color }) {
    const ref = useRef<THREE.Mesh>(null)
    const [hovered, setHover] = useState(false)
    useFrame((state) => {
        if (!ref.current) return
        const t = state.clock.getElapsedTime() + random * 10000
        ref.current.rotation.set(Math.cos(t / 4) / 2, Math.sin(t / 4) / 2, Math.cos(t / 1.5) / 2)
        ref.current.position.y = Math.sin(t / 1.5) / 2
        ref.current.scale.x = ref.current.scale.y = ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, hovered ? 1.4 : 1, 0.1)
        // @ts-expect-error this works, but types are not defined for color in Instance
        ref.current.color.lerp(color.set(hovered ? 'red' : 'white'), hovered ? 1 : 0.1)
    })
    return (
        <group {...props}>
            <Instance ref={ref} onPointerOver={(e) => (e.stopPropagation(), setHover(true))} onPointerOut={(e) => setHover(false)} />
        </group>
    )
}
