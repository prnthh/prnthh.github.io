"use client"

import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'
import { extend, Canvas, useFrame, useThree, ThreeToJSXElements } from '@react-three/fiber'
import { OrbitControls, useGLTF, useTexture, StatsGl } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'

import { reflector } from 'three/tsl'
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js'
import { pass, screenUV, uv, color, texture, normalWorld } from 'three/tsl'
import { ShinyFloor } from '@/shared/shaders/ShinyFloor'
import {
    MeshBasicNodeMaterial,
    WebGPURenderer,
} from 'three/webgpu';
import Sun from './simple/Sun'
import FogBG from '@/shared/shaders/FogBG'
import Lightsource from './simple/lightsource'
import { Physics } from '@react-three/rapier'

extend(THREE as any)

function SceneContent() {
    const { scene, camera, gl } = useThree()
    const modelRef = useRef<THREE.Object3D>(null)
    const mixerRef = useRef<THREE.AnimationMixer>(null)
    const clock = useMemo(() => new THREE.Clock(), [])

    // Load GLTF model and animation
    const { scene: model, animations } = useGLTF('/models/Michelle.glb')
    useEffect(() => {
        model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true
            }
        })
        mixerRef.current = new THREE.AnimationMixer(model)
        mixerRef.current.clipAction(animations[0])?.play()
    }, [model, animations])

    // Postprocessing
    useEffect(() => {
        const scenePass = pass(scene, camera)
        const scenePassColor = scenePass.getTextureNode()
        const scenePassDepth = scenePass.getLinearDepthNode().remapClamp(0.3, 0.5)

        const blur = gaussianBlur(scenePassColor)
        blur.directionNode = scenePassDepth

        const vignette = screenUV.distance(0.5).mul(1.35).clamp().oneMinus()

        // @ts-expect-error Argument of type 'WebGLRenderer' is not assignable to parameter of type 'Renderer'.
        const post = new THREE.PostProcessing(gl)
        post.outputNode = blur.mul(vignette)

        gl.setAnimationLoop(() => {
            const delta = clock.getDelta()
            mixerRef.current?.update(delta)
            post.render()
        })

        return () => gl.setAnimationLoop(null)
    }, [camera, scene, gl, clock])

    return (
        <>
            <OrbitControls
                minDistance={1}
                maxDistance={10}
                maxPolarAngle={Math.PI / 2}
                autoRotate
                autoRotateSpeed={1}
                target={[0, 0.5, 0]}
            />

            <primitive ref={modelRef} object={model} />
            <ShinyFloor />
            <Sun />
            <FogBG />
            <StatsGl />
        </>
    )
}

export default function App() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas
                    shadows
                    gl={async (props) => {
                        const renderer = new WebGPURenderer(props as any)
                        await renderer.init()
                        return renderer
                    }}
                    camera={{ position: [2, 2.5, 3], fov: 50, near: 0.25, far: 30 }}
                >
                    <Physics>
                        <Lightsource model="/models/environment/lamppost2.glb" position={[-1, 0, 1]} />

                    </Physics>

                    <SceneContent />
                </Canvas>
            </div>
        </div>
    )
}
