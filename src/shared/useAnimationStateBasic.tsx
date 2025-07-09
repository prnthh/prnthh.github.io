import { useLoader } from '@react-three/fiber'
import TWEEN, { type Tween } from '@tweenjs/tween.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
    type AnimationAction,
    AnimationMixer,
    type Euler,
    LoopRepeat,
    Mesh,
    type Object3D,
    type Object3DEventMap,
    Vector3,
} from 'three'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/Addons.js'

function filterNeckAnimations(animation: THREE.AnimationClip): THREE.AnimationClip {
    const filteredAnimation = animation.clone()
    filteredAnimation.tracks = animation.tracks.filter((track) => {
        // Filter out any tracks that target the neck bone
        return !track.name.includes('mixamorigNeck')
    })
    return filteredAnimation
}

export default function useAnimationState(
    clone?: Object3D<Object3DEventMap>,
    basePath: string = '/models/human/',
    animationOverrides?: { [key: string]: string },
    onActions?: (actions: { [key: string]: AnimationAction }) => void
) {
    const [thisAnimation, setThisAnimation] = useState<string | string[] | undefined>('idle')
    const [mixer, setMixer] = useState<AnimationMixer | null>(null)
    const prevActionRef = useRef<AnimationAction | null>(null)

    const ANIMATIONS = useMemo(() => {
        const prependBasePath = (path: string) =>
            basePath + path
        const overridesWithBase = animationOverrides
            ? Object.fromEntries(
                Object.entries(animationOverrides).map(([key, value]) => [
                    key,
                    prependBasePath(value),
                ]),
            )
            : {}
        return {
            idle: basePath + '/anim/idle.fbx',
            ...overridesWithBase,
        }
    }, [animationOverrides, basePath])

    const animations = useLoader(FBXLoader, Object.values(ANIMATIONS)).map((f) =>
        filterNeckAnimations(f.animations[0]),
    )
    // const defaultAnims = useAnimations(clone?.animations, mesh);

    const actions = useMemo(
        () =>
            mixer
                ? Object.keys(ANIMATIONS).reduce<{ [key: string]: AnimationAction }>(
                    (acc, key, index) => {
                        acc[key] = mixer.clipAction(animations[index], clone)
                        return acc
                    },
                    {},
                )
                : {},
        [mixer, clone, animations],
    )

    useEffect(() => {
        if (onActions && actions) onActions(actions);
    }, [actions, onActions]);

    useEffect(() => {
        if (!clone) return
        const newMixer = new AnimationMixer(clone)
        setMixer(newMixer)
        // todo: sometimes the default is a tpose. filter and do not play.
        // defaultAnims.clips[0] && newMixer.clipAction(defaultAnims.clips[0], clone).fadeIn(0.1).play();
        return () => {
            newMixer.stopAllAction()
            newMixer.uncacheRoot(newMixer.getRoot())
        }
    }, [clone])

    const lastKeyRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!thisAnimation) return;

        let animationKey: string | undefined;
        if (typeof thisAnimation === 'string') {
            animationKey = thisAnimation;
        } else if (Array.isArray(thisAnimation) && thisAnimation.length > 0) {
            animationKey = thisAnimation[0];
        }

        if (mixer && actions && animationKey && actions[animationKey]) {
            if (lastKeyRef.current !== animationKey) {
                const action = actions[animationKey] || actions.idle;
                let loops = 1;

                if (true) {
                    loops = 100;
                } else if (animationKey === 'eating') loops = 4;
                action.clampWhenFinished = true;

                if (prevActionRef.current && prevActionRef.current !== action) {
                    prevActionRef.current.fadeOut(0.2);
                }
                action.reset().setLoop(LoopRepeat, loops).fadeIn(0.2).play();
                prevActionRef.current = action;
                lastKeyRef.current = animationKey;
            }
        }
    }, [mixer, thisAnimation])

    return {
        thisAnimation,
        setThisAnimation,
        mixer,
        setMixer,
        actions,
    }
}
