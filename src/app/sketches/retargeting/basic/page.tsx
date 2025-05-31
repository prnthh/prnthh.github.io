"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import { FBXLoader } from "three/examples/jsm/Addons.js";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

function RetargetedModels() {
    const group = useRef<THREE.Group>(null);
    const [models, setModels] = useState<{ source: THREE.Group, target: THREE.Group } | null>(null);
    const mixers = useRef<{ source: THREE.AnimationMixer; target: THREE.AnimationMixer } | null>(null);

    const helpers = useRef<THREE.Group>(new THREE.Group());

    // Load animation from FBX file
    const animationFBX = useLoader(FBXLoader, '/anim/idle3.fbx');
    const animationClip = animationFBX.animations[0];

    function getSourceWithFBXAnimation(sourceModel: any, clip: THREE.AnimationClip) {
        const helper = new THREE.SkeletonHelper(sourceModel.scene);
        helpers.current.add(helper);
        const skeleton = new THREE.Skeleton(helper.bones);
        const mixer = new THREE.AnimationMixer(sourceModel.scene);
        mixer.clipAction(clip).play();
        return { clip, skeleton, mixer };
    }

    function retargetAnimationClip(source: any, targetModel: any) {
        // Get the target skinned mesh - more robust approach
        let targetSkin: THREE.SkinnedMesh | null = null;

        targetModel.scene.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.SkinnedMesh && !targetSkin) {
                targetSkin = child;
            }
        });

        if (!targetSkin) {
            console.error("No SkinnedMesh found in target model");
            return null;
        }

        const targetSkelHelper = new THREE.SkeletonHelper(targetModel.scene);
        helpers.current.add(targetSkelHelper);

        const rotateCW45 = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(45));
        const rotateCCW180 = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180));
        const rotateCW180 = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(180));
        const rotateFoot = new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(
                THREE.MathUtils.degToRad(45),
                THREE.MathUtils.degToRad(180),
                THREE.MathUtils.degToRad(0)
            )
        );

        const retargetOptions = {
            hip: "mixamorigHips",
            // Fixed: Use correct scale calculation
            scale: 1 / targetModel.scene.scale.y,
            localOffsets: {
                mixamorigLeftShoulder: rotateCW45,
                mixamorigRightShoulder: rotateCCW180,
                mixamorigLeftArm: rotateCW45,
                mixamorigRightArm: rotateCCW180,
                mixamorigLeftForeArm: rotateCW45,
                mixamorigRightForeArm: rotateCCW180,
                mixamorigLeftHand: rotateCW45,
                mixamorigRightHand: rotateCCW180,
                mixamorigLeftUpLeg: rotateCW180,
                mixamorigRightUpLeg: rotateCW180,
                mixamorigLeftLeg: rotateCW180,
                mixamorigRightLeg: rotateCW180,
                mixamorigLeftFoot: rotateFoot,
                mixamorigRightFoot: rotateFoot,
                mixamorigLeftToeBase: rotateCW180,
                mixamorigRightToeBase: rotateCW180,
            },
            names: {
                mixamorigHips: "mixamorigHips",
                mixamorigSpine: "mixamorigSpine",
                mixamorigSpine2: "mixamorigSpine2",
                mixamorigHead: "mixamorigHead",
                mixamorigLeftShoulder: "mixamorigLeftShoulder",
                mixamorigRightShoulder: "mixamorigRightShoulder",
                mixamorigLeftArm: "mixamorigLeftArm",
                mixamorigRightArm: "mixamorigRightArm",
                mixamorigLeftForeArm: "mixamorigLeftForeArm",
                mixamorigRightForeArm: "mixamorigRightForeArm",
                mixamorigLeftHand: "mixamorigLeftHand",
                mixamorigRightHand: "mixamorigRightHand",
                mixamorigLeftUpLeg: "mixamorigLeftUpLeg",
                mixamorigRightUpLeg: "mixamorigRightUpLeg",
                mixamorigLeftLeg: "mixamorigLeftLeg",
                mixamorigRightLeg: "mixamorigRightLeg",
                mixamorigLeftFoot: "mixamorigLeftFoot",
                mixamorigRightFoot: "mixamorigRightFoot",
                mixamorigLeftToeBase: "mixamorigLeftToeBase",
                mixamorigRightToeBase: "mixamorigRightToeBase",
            },
        };

        // Retarget the FBX animation clip to work with target model
        const retargetedClip = SkeletonUtils.retargetClip(
            targetSkin,
            source.skeleton,
            source.clip,
            retargetOptions
        );

        // Fixed: Create mixer for target SkinnedMesh directly
        const mixer = new THREE.AnimationMixer(targetSkin);
        mixer.clipAction(retargetedClip).play();

        return mixer;
    }

    useEffect(() => {
        if (!animationClip) return;

        let mounted = true;
        const loader = new GLTFLoader();

        Promise.all([
            new Promise<any>((resolve, reject) => {
                loader.load("/models/Michelle.glb", resolve, undefined, reject);
            }),
            new Promise<any>((resolve, reject) => {
                loader.load("/models/Soldier.glb", resolve, undefined, reject);
            }),
        ]).then(([sourceModel, targetModel]) => {
            if (!mounted) return;

            // Position and scale models
            sourceModel.scene.position.x -= 0.8;
            targetModel.scene.position.x += 0.7;
            targetModel.scene.position.z -= 0.1;
            targetModel.scene.scale.setScalar(0.01);

            // Fix: Rotate both models upright (undo 90deg forward tilt)
            sourceModel.scene.rotation.x = -Math.PI / 2;
            targetModel.scene.rotation.x = -Math.PI / 2;

            // Get source animation data using FBX animation
            const source = getSourceWithFBXAnimation(sourceModel, animationClip);

            // Retarget the FBX animation clip to work with target model
            const targetMixer = retargetAnimationClip(source, targetModel);

            if (targetMixer) {
                mixers.current = { source: source.mixer, target: targetMixer };
                setModels({ source: sourceModel.scene, target: targetModel.scene });
            }
        }).catch(error => {
            console.error("Error loading models:", error);
        });

        return () => {
            mounted = false;
            // Cleanup mixers
            if (mixers.current) {
                mixers.current.source.stopAllAction();
                mixers.current.target.stopAllAction();
            }
        };
    }, [animationClip]);

    useFrame((state, delta) => {
        if (mixers.current) {
            mixers.current.source.update(delta);
            mixers.current.target.update(delta);
        }
    });

    if (!models || !animationClip) return null;

    return (
        <group ref={group}>
            <primitive object={models.source} />
            <primitive object={models.target} />
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial color="#888" opacity={0.2} transparent />
            </mesh>
            {/* Uncomment for debugging skeleton */}
            {/* <primitive object={helpers.current} /> */}
        </group>
    );
}

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas camera={{ position: [0, 1, 4], fov: 40 }}>
                    <ambientLight intensity={0.5} />
                    <hemisphereLight args={[0xe9c0a5, 0x0175ad, 5]} />
                    <directionalLight position={[2, 5, 2]} intensity={4} color={0xfff9ea} />
                    <Suspense fallback={null}>
                        <RetargetedModels />
                    </Suspense>
                    <OrbitControls minDistance={3} maxDistance={12} target={[0, 1, 0]} maxPolarAngle={Math.PI / 2} />
                </Canvas>
            </div>
        </div>
    );
}