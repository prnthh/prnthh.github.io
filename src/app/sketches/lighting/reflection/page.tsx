"use client"

import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'
import { extend, Canvas, useFrame, useThree, ThreeToJSXElements } from '@react-three/fiber'
import { OrbitControls, useGLTF, useTexture, StatsGl } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'

import { reflector } from 'three/tsl'
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js'
import { pass, screenUV, uv, color, texture, normalWorld } from 'three/tsl'
import { ShinyFloor } from './ShinyFloor'
import {
    MeshBasicNodeMaterial,
    WebGPURenderer,
} from 'three/webgpu';

declare module '@react-three/fiber' {
    interface ThreeElements extends ThreeToJSXElements<typeof THREE> { }
}

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

    // Fog & background node
    useEffect(() => {
        scene.fog = new THREE.Fog(0x0487e2, 7, 25)
        scene.backgroundNode = normalWorld.y.mix(color(0x0487e2), color(0x0066ff))
    }, [scene])

    // Lights
    useEffect(() => {
        const sun = new THREE.DirectionalLight(0xffe499, 2)
        sun.castShadow = true
        sun.shadow.camera.left = -2
        sun.shadow.camera.right = 2
        sun.shadow.camera.top = 2
        sun.shadow.camera.bottom = -2
        sun.shadow.mapSize.set(2048, 2048)
        sun.shadow.bias = -0.001
        sun.position.set(0.5, 3, 0.5)

        const hemi1 = new THREE.HemisphereLight(0x333366, 0x74ccf4, 3)
        const hemi2 = new THREE.HemisphereLight(0x74ccf4, 0, 1)

        scene.add(sun, hemi1, hemi2)
    }, [scene])


    // Postprocessing
    useEffect(() => {
        const scenePass = pass(scene, camera)
        const scenePassColor = scenePass.getTextureNode()
        const scenePassDepth = scenePass.getLinearDepthNode().remapClamp(0.3, 0.5)

        const blur = gaussianBlur(scenePassColor)
        blur.directionNode = scenePassDepth

        const vignette = screenUV.distance(0.5).mul(1.35).clamp().oneMinus()

        // @ts-ignore
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
                    <SceneContent />
                </Canvas>
            </div>
        </div>
    )
}
