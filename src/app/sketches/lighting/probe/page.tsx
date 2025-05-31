"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LightProbeGenerator } from "three/examples/jsm/lights/LightProbeGenerator.js";
import { LightProbeHelper } from "three/examples/jsm/helpers/LightProbeHelper.js";

function LightProbeLoader({ enabled }: { enabled: boolean }) {
    const { scene, gl } = useThree();
    useEffect(() => {
        if (!enabled) return;
        let probe: THREE.LightProbe | undefined, helper: any;
        const lightProbe = new THREE.LightProbe();
        scene.add(lightProbe);
        // Create cube render target and cube camera
        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
        const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
        cubeCamera.position.set(0, 0, 0);
        scene.add(cubeCamera);
        cubeCamera.update(gl, scene);
        // Use globally imported LightProbeGenerator and LightProbeHelper
        (async () => {
            probe = await LightProbeGenerator.fromCubeRenderTarget(gl, cubeRenderTarget);
            lightProbe.copy(probe);
            helper = new LightProbeHelper(lightProbe, 20);
            scene.add(helper);
        })();
        return () => {
            if (helper) scene.remove(helper);
            scene.remove(lightProbe);
            scene.remove(cubeCamera);
        };
    }, [scene, gl, enabled]);
    return null;
}

function ReflectiveSpheres({ onToggle }: { onToggle: () => void }) {
    const { scene } = useThree();
    const meshRefs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];

    useEffect(() => {
        const loader = new THREE.CubeTextureLoader();
        const urls = [
            "/textures/cube/pisa/px.png",
            "/textures/cube/pisa/nx.png",
            "/textures/cube/pisa/py.png",
            "/textures/cube/pisa/ny.png",
            "/textures/cube/pisa/pz.png",
            "/textures/cube/pisa/nz.png",
        ];
        loader.load(urls, (cubeTexture) => {
            scene.background = cubeTexture;
            meshRefs.forEach(ref => {
                if (ref.current) {
                    (ref.current.material as THREE.MeshStandardMaterial).envMap = cubeTexture;
                    (ref.current.material as THREE.MeshStandardMaterial).envMapIntensity = 1;
                    (ref.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
                }
            });
        });
    }, [scene]);

    return (
        <>
            <mesh ref={meshRefs[0]} position={[-10, 0, 0]} onClick={onToggle}>
                <sphereGeometry args={[5, 64, 32]} />
                <meshStandardMaterial color={0xffffff} metalness={0} roughness={0} />
            </mesh>
            <mesh ref={meshRefs[1]} position={[10, 0, 0]} onClick={onToggle}>
                <sphereGeometry args={[5, 64, 32]} />
                <meshStandardMaterial color={0xffffff} metalness={0} roughness={0} />
            </mesh>
        </>
    );
}

export default function Home() {
    const [probeOn, setProbeOn] = useState(true);
    const handleToggle = () => setProbeOn((v) => !v);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 10]} intensity={0.6} />
                    <ReflectiveSpheres onToggle={handleToggle} />
                    <OrbitControls minDistance={10} maxDistance={50} enablePan={false} />
                    <LightProbeLoader enabled={probeOn} />
                </Canvas>
            </div>
        </div>
    );
}
