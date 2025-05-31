"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/Addons.js";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

type RetargetedModelsProps = {
    model?: string;
    source?: string;
};

function RetargetedModels({ model = '/models/Soldier.glb', source = '/models/Michelle.glb' }: RetargetedModelsProps) {

    const gltfSource = useGLTF(source);
    const gltfTarget = useGLTF(model);
    const group = useRef<THREE.Group>(null);
    const [models, setModels] = useState<{ source: THREE.Group, target: THREE.Group } | null>(null);
    const mixers = useRef<{ target: THREE.AnimationMixer } | null>(null);
    const helpers = useRef<THREE.Group>(new THREE.Group());

    // Load animation from FBX file
    const animationFBX = useLoader(FBXLoader, '/anim/idle3.fbx');
    const animationClip = animationFBX.animations[0];

    function getSourceWithFBXAnimation(sourceModel: THREE.Object3D, clip: THREE.AnimationClip) {
        const helper = new THREE.SkeletonHelper(sourceModel);
        helpers.current.add(helper);
        const skeleton = new THREE.Skeleton(helper.bones);
        const mixer = new THREE.AnimationMixer(sourceModel);
        mixer.clipAction(clip).play();
        return { clip, skeleton, mixer };
    }

    function retargetAnimationClip(source: any, targetModel: THREE.Group) {
        let targetSkin: THREE.SkinnedMesh | null = null;

        targetModel.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.SkinnedMesh && !targetSkin) {
                targetSkin = child;
            }
        });

        if (!targetSkin) {
            console.error("No SkinnedMesh found in target model");
            return null;
        }

        const targetSkelHelper = new THREE.SkeletonHelper(targetModel);
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
            scale: 1 / targetModel.scale.y,
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

        const retargetedClip = SkeletonUtils.retargetClip(
            targetSkin,
            source.skeleton,
            source.clip,
            retargetOptions
        );

        const mixer = new THREE.AnimationMixer(targetSkin);
        mixer.clipAction(retargetedClip).play();

        return mixer;
    }

    useEffect(() => {
        if (!animationClip || !gltfSource?.scene || !gltfTarget?.scene) return;

        // Clone models to avoid shared state mutation
        const sourceClone = SkeletonUtils.clone(gltfSource.scene) as THREE.Group;
        const targetClone = SkeletonUtils.clone(gltfTarget.scene) as THREE.Group;

        targetClone.position.z -= 0.1;
        targetClone.scale.setScalar(0.01);
        targetClone.rotation.x = -Math.PI / 2;

        const source = getSourceWithFBXAnimation(sourceClone, animationClip);
        const targetMixer = retargetAnimationClip(source, targetClone);

        if (targetMixer) {
            mixers.current = { target: targetMixer };
            setModels({ source: sourceClone, target: targetClone });
        }

        return () => {
            if (mixers.current) {
                mixers.current.target.stopAllAction();
            }
        };
    }, [animationClip, gltfSource, gltfTarget]);

    useFrame((state, delta) => {
        if (mixers.current) {
            mixers.current.target.update(delta);
        }
    });

    if (!models || !animationClip) return null;

    return (
        <group ref={group}>
            <primitive object={models.target} />
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
                        <group position={[1, 0, 1]}>
                            <RetargetedModels />
                        </group>
                        <group position={[-1, 0, 1]}>
                            <RetargetedModels model="/models/rigga.glb" />
                        </group>
                        <group position={[-1, 0, -1]}>
                            <RetargetedModels model="/models/rigga2.glb" />
                        </group>
                        <group position={[1, 0, -1]}>
                            <RetargetedModels model="/models/Michelle.glb" />
                        </group>
                    </Suspense>

                    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[50, 50]} />
                        <meshStandardMaterial color="#888" opacity={0.2} transparent />
                    </mesh>
                    <OrbitControls minDistance={3} maxDistance={12} target={[0, 1, 0]} maxPolarAngle={Math.PI / 2} />
                </Canvas>
            </div>
        </div >
    );
}
