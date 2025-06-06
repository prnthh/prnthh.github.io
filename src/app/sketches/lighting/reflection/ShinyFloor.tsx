"use client"

import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'
import { extend, Canvas, useFrame, useThree, ThreeToJSXElements } from '@react-three/fiber'
import { OrbitControls, useGLTF, useTexture, StatsGl } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'

import { reflector } from 'three/tsl'
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js'
import { pass, screenUV, uv, color, texture, normalWorld } from 'three/tsl'

declare module '@react-three/fiber' {
    interface ThreeElements extends ThreeToJSXElements<typeof THREE> { }
}

extend(THREE as any)


export const ShinyFloor = () => {
    const { scene } = useThree()

    // Floor textures
    const [floorColor, floorNormal] = useTexture([
        '/textures/floor/checker/FloorsCheckerboard_S_Diffuse.jpg',
        '/textures/floor/checker/FloorsCheckerboard_S_Normal.jpg'
    ])
    floorColor.colorSpace = THREE.SRGBColorSpace
    floorColor.wrapS = floorColor.wrapT = THREE.RepeatWrapping
    floorNormal.wrapS = floorNormal.wrapT = THREE.RepeatWrapping

    // Floor UV & reflection setup
    const floorUV = useMemo(() => uv().mul(15), [])
    const floorNormalOffset = useMemo(() => texture(floorNormal, floorUV).xy.mul(2).sub(1).mul(0.02), [floorNormal])
    const reflection = useMemo(() => {
        const r = reflector({ resolution: 0.5 })
        r.target.rotation.x = -Math.PI / 2
        if (r.uvNode)
            r.uvNode = r.uvNode.add(floorNormalOffset)
        scene.add(r.target)
        return r
    }, [scene, floorNormalOffset])

    return <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[50, 0.001, 50]} />
        <meshPhongNodeMaterial attach="material" colorNode={texture(floorColor, floorUV).add(reflection)} />
    </mesh>
}