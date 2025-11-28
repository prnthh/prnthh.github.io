"use client"

import { extend, Canvas, useFrame, useThree, ThreeToJSXElements } from '@react-three/fiber'
import { OrbitControls, useGLTF, useTexture, StatsGl, Plane } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'

import { reflector } from 'three/tsl'
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js'
import { pass, screenUV, uv, color, texture, normalWorld } from 'three/tsl'
import { ShinyFloor } from '@/shared/shaders/floor/ShinyFloorMaterial'
import {
    AnimationMixer,
    Clock,
    Mesh,
    Object3D,
    PostProcessing,
    WebGPURenderer,
} from 'three/webgpu';
import Sun from '@/shared/lighting/Sun'
import FogBG from '@/shared/shaders/FogBG'
import Lightsource from '@/shared/lighting/lightsource'
import { Physics } from '@react-three/rapier'


function SceneContent() {
    const { scene, camera, gl } = useThree()
    const modelRef = useRef<Object3D>(null)
    const mixerRef = useRef<AnimationMixer>(null)
    const clock = useMemo(() => new Clock(), [])

    // Load GLTF model and animation
    const { scene: model, animations } = useGLTF('/models/human/Michelle.glb')
    useEffect(() => {
        model.traverse((child) => {
            if ((child as Mesh).isMesh) {
                child.castShadow = true
            }
        })
        mixerRef.current = new AnimationMixer(model)
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
        const post = new PostProcessing(gl)
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
            <Plane rotation={[-Math.PI / 2, 0, 0]} args={[32, 32, 256, 256]} receiveShadow>
                <ShinyFloor />
            </Plane>
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
