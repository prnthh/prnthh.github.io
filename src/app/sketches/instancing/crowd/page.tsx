"use client"
import { Environment, OrbitControls, Plane, useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
    color,
    mix,
    oscSine,
    pass,
    range,
    time
} from "three/tsl";
import { MeshStandardNodeMaterial, PostProcessing } from "three/webgpu";
import { useThree, useFrame, useLoader } from "@react-three/fiber";
import { FBXLoader } from "three/examples/jsm/Addons.js";
import { Stats } from '@react-three/drei'
import { ShinyFloor } from "@/shared/shaders/floor/ShinyFloorMaterial";
import GameCanvas from "@/shared/GameCanvas";

const INSTANCE_COUNT = 100;
const MODEL_URL = "/models/human/rigga/rigga2.glb";
const ANIM_URL = "/models/human/anim/run.fbx";

export default function Home() {
    return (
        <div className="items-center justify-items-center h-screen">
            <GameCanvas>
                <SceneContent />
                <Stats className="!left-auto right-0" />
            </GameCanvas>
        </div>
    );
}

const SceneContent = () => {
    const { camera, scene, gl } = useThree();
    const postProcessingRef = useRef<PostProcessing | null>(null);

    useEffect(() => {
        camera.lookAt(0, 1, 0);
    }, [camera, scene, gl]);

    useFrame(() => {
        if (postProcessingRef.current) {
            postProcessingRef.current.render();
        }
    });

    return (
        <>
            <directionalLight position={[4, 4, 4]} castShadow intensity={2} />
            <ambientLight intensity={1.5} />

            {/* Animated model */}
            <AnimatedModel />
            <Plane rotation={[-Math.PI / 2, 0, 0]} position={[32, 0, 16]} args={[32, 32, 256, 256]} receiveShadow>

                <ShinyFloor />
            </Plane>
            <OrbitControls enableDamping={false} />
        </>
    );
};

const AnimatedModel = () => {
    const gltf = useGLTF(MODEL_URL);
    const animations = useLoader(FBXLoader, ANIM_URL);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef(new THREE.Clock());
    const modelRef = useRef<THREE.Group | null>(null);

    useEffect(() => {
        if (gltf && gltf.scene && animations && modelRef.current) {
            // Don't clone - work with the original scene but create a new mixer for this instance
            const object = modelRef.current;

            // Create mixer and play animation using the FBX animation like npc3
            const mixer = new THREE.AnimationMixer(object);
            const clip = animations.animations[0];
            if (clip) {
                const action = mixer.clipAction(clip, object);
                action.play();
            }
            mixerRef.current = mixer;

            const dummy = new THREE.Object3D();

            object.traverse((child: any) => {
                if (child.isMesh) {
                    // Enable shadow casting for the mesh
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // applyTexture(child);

                    child.isInstancedMesh = true;
                    child.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(INSTANCE_COUNT * 16), 16);
                    child.count = INSTANCE_COUNT;

                    for (let i = 0; i < INSTANCE_COUNT; i++) {
                        dummy.position.x = -200 + ((i % 10) * 70);
                        dummy.position.y = -50;
                        dummy.position.z = Math.floor(i / 10) * -70;

                        dummy.updateMatrix();
                        dummy.matrix.toArray(child.instanceMatrix.array, i * 16);
                    }
                }
            });
        }
    }, [gltf, animations, modelRef.current]);

    useFrame(() => {
        if (mixerRef.current) {
            const delta = clockRef.current.getDelta();
            mixerRef.current.update(delta);
        }
    });

    return gltf ? <primitive ref={modelRef} object={gltf.scene} /> : null;
};

const applyTexture = (child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const oscNode = oscSine(time.mul(.1));
        const randomColors = range(color(0x000000), color(0xFFFFFF));
        const randomMetalness = range(0, 1);
        child.material = new MeshStandardNodeMaterial();
        child.material.roughness = .1;
        child.material.metalnessNode = mix(0.0, randomMetalness, oscNode);
        child.material.colorNode = mix(color(0xFFFFFF), randomColors, oscNode);
    }
}
