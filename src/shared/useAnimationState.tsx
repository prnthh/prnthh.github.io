import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AnimationAction,
    AnimationClip,
    AnimationMixer,
    LoopRepeat,
    Matrix4,
    Object3D,
    SkinnedMesh,
    SkeletonHelper,
} from 'three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Filter neck animations
function filterNeckAnimations(animation: AnimationClip): AnimationClip {
    const filteredAnimation = animation.clone();
    filteredAnimation.tracks = animation.tracks.filter(
        (track) => !track.name.includes('mixamorigNeck'),
    );
    return filteredAnimation;
}

export default function useAnimationState(
    clone?: Object3D,
    animationOverrides?: { [key: string]: string },
) {
    const [thisAnimation, setThisAnimation] = useState<string | undefined>('idle');
    const [mixer, setMixer] = useState<AnimationMixer | null>(null);

    const currentTweenRef = useRef<any | null>(null);
    const currentTimeoutRef = useRef<any | null>(null);

    // Define animations
    const ANIMATIONS = useMemo(() => {
        return {
            idle: '/anim/idle2.fbx',
            walk: '/anim/walk.fbx',
            run: '/anim/run.fbx',
            jump: '/anim/jump.fbx',
            ...animationOverrides,
        };
    }, [animationOverrides]);

    const { scene: sourceModel } = useLoader(GLTFLoader, '/models/rigga4.glb');

    const sourceSkeleton = useMemo(() => {
        if (!sourceModel) return null;
        const skinnedMesh = sourceModel.getObjectByProperty('type', 'SkinnedMesh') as SkinnedMesh;
        if (!skinnedMesh || !skinnedMesh.skeleton) {
            console.warn('Source model has no valid SkinnedMesh or skeleton');
            return null;
        }
        return new THREE.Skeleton(skinnedMesh.skeleton.bones);
    }, [sourceModel]);

    // Load animations
    const animations = useLoader(FBXLoader, Object.values(ANIMATIONS)).map((f) =>
        filterNeckAnimations(f.animations[0]),
    );

    // Find target SkinnedMesh
    const targetSkinnedMesh = useMemo(() => {
        if (!clone) return null;
        const skinnedMesh = clone.getObjectByProperty('type', 'SkinnedMesh') as SkinnedMesh;
        if (!skinnedMesh || !skinnedMesh.skeleton) {
            console.warn('Target clone has no valid SkinnedMesh or skeleton');
            return null;
        }
        return skinnedMesh;
    }, [clone]);

    useEffect(() => {
        if (clone && targetSkinnedMesh) {
            const targetScale = 1;
            clone.scale.setScalar(targetScale);

            const helper = new SkeletonHelper(targetSkinnedMesh);
            clone.add(helper);
        }
    }, [clone, targetSkinnedMesh]);

    const retargetOptions = {
        hip: 'mixamorigHips',
        scale: 1,
        localOffsets: {
            mixamorigLeftShoulder: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)),
            mixamorigRightShoulder: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180)),
            mixamorigLeftArm: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)),
            mixamorigRightArm: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180)),
            mixamorigLeftForeArm: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)),
            mixamorigRightForeArm: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180)),
            mixamorigLeftHand: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(45)),
            mixamorigRightHand: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(-180)),
            mixamorigLeftUpLeg: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
            mixamorigRightUpLeg: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
            mixamorigLeftLeg: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
            mixamorigRightLeg: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
            mixamorigLeftFoot: new Matrix4().makeRotationFromEuler(
                new THREE.Euler(
                    THREE.MathUtils.degToRad(45),
                    THREE.MathUtils.degToRad(180),
                    0,
                ),
            ),
            mixamorigRightFoot: new Matrix4().makeRotationFromEuler(
                new THREE.Euler(
                    THREE.MathUtils.degToRad(45),
                    THREE.MathUtils.degToRad(180),
                    0,
                ),
            ),
            mixamorigLeftToeBase: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
            mixamorigRightToeBase: new Matrix4().makeRotationY(THREE.MathUtils.degToRad(180)),
        },
        names: {
            mixamorigHips: 'mixamorigHips',
            mixamorigSpine: 'mixamorigSpine',
            mixamorigSpine2: 'mixamorigSpine2',
            mixamorigHead: 'mixamorigHead',
            mixamorigLeftShoulder: 'mixamorigLeftShoulder',
            mixamorigRightShoulder: 'mixamorigRightShoulder',
            mixamorigLeftArm: 'mixamorigLeftArm',
            mixamorigRightArm: 'mixamorigRightArm',
            mixamorigLeftForeArm: 'mixamorigLeftForeArm',
            mixamorigRightForeArm: 'mixamorigRightForeArm',
            mixamorigLeftHand: 'mixamorigLeftHand',
            mixamorigRightHand: 'mixamorigRightHand',
            mixamorigLeftUpLeg: 'mixamorigLeftUpLeg',
            mixamorigRightUpLeg: 'mixamorigRightUpLeg',
            mixamorigLeftLeg: 'mixamorigLeftLeg',
            mixamorigRightLeg: 'mixamorigRightLeg',
            mixamorigLeftFoot: 'mixamorigLeftFoot',
            mixamorigRightFoot: 'mixamorigRightFoot',
            mixamorigLeftToeBase: 'mixamorigLeftToeBase',
            mixamorigRightToeBase: 'mixamorigRightToeBase',
        },
    };

    const retargetedClips = useMemo(() => {
        if (!targetSkinnedMesh || !sourceSkeleton || !sourceModel || !animations.length) {
            return animations;
        }

        return animations.map((clip) =>
            SkeletonUtils.retargetClip(targetSkinnedMesh, sourceSkeleton, clip, retargetOptions),
        );
    }, [targetSkinnedMesh, sourceSkeleton, sourceModel, animations]);

    // Set up animation actions
    const actions = useMemo(
        () =>
            mixer && targetSkinnedMesh
                ? Object.keys(ANIMATIONS).reduce<{ [key: string]: AnimationAction }>(
                    (acc, key, index) => {
                        const clip = retargetedClips[index] || animations[index];
                        acc[key] = mixer.clipAction(clip, targetSkinnedMesh);
                        return acc;
                    },
                    {},
                )
                : {},
        [mixer, targetSkinnedMesh, animations, retargetedClips],
    );

    // Initialize mixer
    useEffect(() => {
        if (!targetSkinnedMesh) {
            console.warn('No valid SkinnedMesh found for AnimationMixer');
            return;
        }
        const newMixer = new AnimationMixer(targetSkinnedMesh);
        setMixer(newMixer);
        return () => {
            newMixer.stopAllAction();
            newMixer.uncacheRoot(newMixer.getRoot());
        };
    }, [targetSkinnedMesh]);

    // Play animations
    useEffect(() => {
        if (!thisAnimation || !mixer || !actions[thisAnimation] || !targetSkinnedMesh) {
            console.warn('Cannot play animation: missing required components');
            return;
        }

        const action = actions[thisAnimation] || actions.idle;
        const loops = thisAnimation === 'eating' ? 4 : 100;
        action.clampWhenFinished = true;

        action.reset().setLoop(LoopRepeat, loops).fadeIn(0.5).play();

        return () => {
            action.fadeOut(0.5);
        };
    }, [mixer, thisAnimation, actions, targetSkinnedMesh]);

    return {
        thisAnimation,
        setThisAnimation,
        mixer,
        setMixer,
        actions,
    };
}