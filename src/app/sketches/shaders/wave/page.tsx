"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { MeshDistortMaterial, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState } from "react";

function Scene() {
    // Load textures
    const waterTexture = useTexture("/textures/water4.png");
    const dudvTexture = useTexture("/textures/water1.png"); // Using water1.png as dudv map

    // Configure texture tiling and filtering
    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
    dudvTexture.wrapS = dudvTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(4, 4);
    dudvTexture.repeat.set(4, 4);

    // Create render targets for depth pass
    const [renderTarget] = useState(() => {
        const rt = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight
        );
        rt.texture.minFilter = THREE.NearestFilter;
        rt.texture.magFilter = THREE.NearestFilter;
        rt.texture.generateMipmaps = false;
        rt.stencilBuffer = false;

        // Add depth texture if supported
        rt.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
        rt.depthTexture.type = THREE.UnsignedShortType;
        return rt;
    });

    // Initialize depth material
    const [depthMaterial] = useState(() => {
        const material = new THREE.MeshDepthMaterial();
        material.depthPacking = THREE.RGBADepthPacking;
        return material;
    });

    // Water parameters state
    const [params] = useState({
        foamColor: new THREE.Color(0xffffff),
        waterColor: new THREE.Color(0x14c6a5),
        threshold: 0.1
    });

    const waterMaterial = useRef<THREE.ShaderMaterial>(null);
    const depthMaterialRef = useRef<THREE.MeshDepthMaterial>(null);

    const waterShader = {
        uniforms: {
            time: { value: 0 },
            tDudv: { value: dudvTexture },
            tWater: { value: waterTexture },
            tDepth: { value: renderTarget.depthTexture },
            cameraNear: { value: 0.1 },
            cameraFar: { value: 1000 },
            threshold: { value: params.threshold },
            foamColor: { value: params.foamColor },
            waterColor: { value: params.waterColor },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec3 vNormal;

            void main() {
                vUv = uv;
                vPosition = position;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform sampler2D tDudv;
            uniform sampler2D tWater;
            uniform sampler2D tDepth;
            uniform float cameraNear;
            uniform float cameraFar;
            uniform float threshold;
            uniform vec3 foamColor;
            uniform vec3 waterColor;
            uniform vec2 resolution;

            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec3 vNormal;

            float getDepth(const in vec2 screenPosition) {
                return texture2D(tDepth, screenPosition).x;
            }

            float getLinearDepth(const in vec2 screenPosition) {
                float depth = getDepth(screenPosition);
                float near = cameraNear;
                float far = cameraFar;
                return 2.0 * near * far / (far + near - depth * (far - near));
            }

            void main() {
                vec2 distortedUv = vUv;
                
                // Sample dudv map for distortion
                vec2 distortion = texture2D(tDudv, vec2(vUv.x + time * 0.05, vUv.y + time * 0.08)).rg;
                distortion = (distortion * 2.0 - 1.0) * 0.2;
                
                // Apply distortion to UV coordinates
                distortedUv += distortion;
                
                // Sample water texture with distorted UVs
                vec4 waterColor1 = texture2D(tWater, distortedUv);
                vec4 waterColor2 = texture2D(tWater, distortedUv * 2.0 + vec2(time * -0.05, time * 0.04));
                
                // Mix water colors for more detail
                vec4 finalWaterColor = mix(waterColor1, waterColor2, 0.5);

                // Get scene depth
                float sceneDepth = getLinearDepth(gl_FragCoord.xy / resolution);
                float surfaceDepth = getLinearDepth(vUv);
                float depthDiff = abs(sceneDepth - surfaceDepth);

                // Create foam effect based on depth difference
                float foam = smoothstep(0.0, threshold, depthDiff);
                
                // Mix water and foam colors
                vec3 finalColor = mix(waterColor, foamColor, foam);
                finalColor = finalColor * (finalWaterColor.rgb + 0.5);

                // Add some fresnel effect
                vec3 viewDir = normalize(cameraPosition - vPosition);
                float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
                finalColor = mix(finalColor, vec3(1.0), fresnel * 0.3);

                gl_FragColor = vec4(finalColor, 0.9);
            }
        `
    };

    useFrame((state) => {
        if (waterMaterial.current) {
            waterMaterial.current.uniforms.time.value = state.clock.getElapsedTime();
            waterMaterial.current.uniforms.threshold.value = params.threshold;
        }
    });

    return (
        <Physics>
            {/* Border boxes */}
            <RigidBody type="fixed">
                <mesh position={[5, 0, 0]} rotation={[Math.PI * 0.5, 0, Math.PI * 0.5]}>
                    <boxGeometry args={[10, 1, 1]} />
                    <meshStandardMaterial color="#ea4d10" />
                </mesh>
                <mesh position={[-5, 0, 0]} rotation={[Math.PI * 0.5, 0, Math.PI * 0.5]}>
                    <boxGeometry args={[10, 1, 1]} />
                    <meshStandardMaterial color="#ea4d10" />
                </mesh>
                <mesh position={[0, 0, 5]}>
                    <boxGeometry args={[10, 1, 1]} />
                    <meshStandardMaterial color="#ea4d10" />
                </mesh>
                <mesh position={[0, 0, -5]}>
                    <boxGeometry args={[10, 1, 1]} />
                    <meshStandardMaterial color="#ea4d10" />
                </mesh>
                <mesh position={[0, -0.5, 0]}>
                    <boxGeometry args={[10, 0.01, 10]} />
                    <meshStandardMaterial color="#ea4d10" />
                </mesh>
            </RigidBody>

            {/* Center box */}
            <RigidBody>
                <mesh position={[0, 1, 0]} rotation={[Math.PI * 0.1, Math.PI * 0.05, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#ea4d10" />
                </mesh>
            </RigidBody>

            {/* Water surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[10, 10, 128, 128]} />
                <shaderMaterial
                    ref={waterMaterial}
                    uniforms={waterShader.uniforms}
                    vertexShader={waterShader.vertexShader}
                    fragmentShader={waterShader.fragmentShader}
                    transparent={true}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
            <OrbitControls />
        </Physics>
    );
}

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas shadows camera={{ position: [0, 7, 10], fov: 70 }}>
                    <Scene />
                </Canvas>
            </div>
        </div>
    );
}
