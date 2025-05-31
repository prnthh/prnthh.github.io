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

// Add this function before creating the actions
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
    animationOverrides?: { [key: string]: string },
) {
    const [thisAnimation, setThisAnimation] = useState<string | undefined>('idle')
    const [lastAction, setLastAction] = useState<AnimationAction | undefined>()
    const [mixer, setMixer] = useState<AnimationMixer | null>(null)

    const currentTweenRef = useRef<any | null>(null)
    const currentTimeoutRef = useRef<any | null>(null)

    // load animations and set up mixer

    const ANIMATIONS = useMemo(() => {
        return {
            idle: '/anim/idle2.fbx',
            walk: '/anim/walk.fbx',
            run: '/anim/run.fbx',
            jump: '/anim/jump.fbx',
            ...animationOverrides,
        }
    }, [animationOverrides])

    const animations = useLoader(FBXLoader, Object.values(ANIMATIONS)).map((f) =>
        (f.animations[0]),
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

    useEffect(() => {
        if (!thisAnimation) {
            return
        }
        if (mixer && actions && thisAnimation && actions[thisAnimation]) {
            const action = (thisAnimation && actions[thisAnimation]) || actions.idle
            let loops = 1

            // biome-ignore lint/correctness/noConstantCondition: <always loop multiplayer animations>
            if (true) {
                loops = 100
            } else if (thisAnimation === 'eating') loops = 4
            action.clampWhenFinished = true

            action?.reset().setLoop(LoopRepeat, loops).fadeIn(0.5).play()

            return () => {
                action.fadeOut(0.5)
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
