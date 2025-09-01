
import { useEffect, useRef, useMemo, useState } from 'react'
import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { Stats, OrbitControls, Environment, Instances, Instance, RoundedBoxGeometry } from '@react-three/drei'
import PostProcessingEffects from '@/shared/shaders/PostProcessingEffects'

export default () => (
    <Canvas
        dpr={[1, 1.5]}
        camera={{ fov: 50, position: [5, 8, 6] }}
        gl={(props) => {
            // Inject three/webgl into React, so that all its constructs are available declaratively
            // extend({ ...THREE, RoomEnvironment })
            const renderer = new THREE.WebGPURenderer({ ...props, antialias: false })
            return renderer.init().then(() => renderer)
        }}>
        <color attach="background" args={['#eee']} />
        <OrbitControls />
        <Blocks />
        <PostProcessingEffects />
        <Stats />
    </Canvas>
)

function Blocks() {
    const blocks = useMemo(() => {
        const array: { color: number; offset: number; position: [number, number, number] }[] = []
        for (let z = -10; z < 10; z++) {
            for (let x = -10; x < 10; x++) {
                const offset = Math.random() * Math.PI * 2
                array.push({ color: 0xffffff * Math.random(), offset, position: [x, Math.sin(offset), z] as [number, number, number] })
            }
        }
        return array
    }, [])
    return (
        <Instances>
            <RoundedBoxGeometry args={[1, 3, 1]} radius={0.05} steps={1} smoothness={4} bevelSegments={4} creaseAngle={0.4} />
            <meshStandardMaterial metalness={0.15} roughness={0.2} />
            {blocks.map((config, i) => (
                <Block index={i} {...config} />
            ))}
        </Instances>
    )
}

function Block({ offset, color, index, ...props }: { offset: number; color: number; position: [number, number, number]; index: number }) {
    const ref = useRef<THREE.Mesh>(null!)
    useFrame((state) => (ref.current.position.y = Math.sin(state.clock.elapsedTime + offset)))
    return (
        <group {...props}>
            <Instance ref={ref} color={color} />
        </group>
    )
}