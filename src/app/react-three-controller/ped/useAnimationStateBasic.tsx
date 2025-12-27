import { useEffect, useMemo, useRef, useState } from 'react'
import { type AnimationAction, AnimationClip, AnimationMixer, LoopRepeat, type Object3D, Object3DEventMap } from 'three'
import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/Addons.js'

const filterNeckAnimations = (animation: AnimationClip): AnimationClip => {
    const filteredAnimation = animation.clone()
    filteredAnimation.tracks = animation.tracks.filter((track) => !track.name.includes('mixamorigNeck'))
    return filteredAnimation
}

const cloneClip = (clip: AnimationClip) => (clip as any).clone?.() ?? clip

export default function useAnimationState(
    clone?: Object3D<Object3DEventMap>,
    basePath: string = '/models/human/',
    animationOverrides?: { [key: string]: string },
    onActions?: (actions: { [key: string]: AnimationAction }) => void,
    modelAnimations?: AnimationClip[]
) {
    const [thisAnimation, setThisAnimation] = useState<string | string[] | undefined>('idle')
    const [mixer, setMixer] = useState<AnimationMixer | null>(null)
    const prevActionRef = useRef<AnimationAction | null>(null)
    const lastKeyRef = useRef<string | undefined>(undefined)

    const ANIMATIONS = useMemo(() => {
        const overridesWithBase = animationOverrides
            ? Object.fromEntries(Object.entries(animationOverrides).map(([key, value]) => [key, basePath + value]))
            : {}
        return { idle: basePath + '/anim/idle.fbx', ...overridesWithBase }
    }, [animationOverrides, basePath])

    const animationPaths = useMemo(() => {
        if (modelAnimations?.length || !basePath || basePath === '/') return []
        return Object.values(ANIMATIONS)
    }, [ANIMATIONS, basePath, modelAnimations])

    const _loaded = animationPaths.length ? useLoader(FBXLoader, animationPaths) : []
    const fbxAnimations = useMemo(() =>
        _loaded.map((f) => filterNeckAnimations(f.animations[0])),
        [_loaded]
    )

    const modelAnimationMap = useMemo(() => {
        const map: { [key: string]: AnimationClip } = {}
        modelAnimations?.forEach((clip) => {
            if (clip.name) map[clip.name.toLowerCase()] = filterNeckAnimations(clip)
        })
        return map
    }, [modelAnimations])

    const actions = useMemo(() => {
        if (!mixer) return {} as { [key: string]: AnimationAction }
        const map: { [key: string]: AnimationAction } = {}

        // Model animations first (built-in)
        Object.entries(modelAnimationMap).forEach(([name, clip]) => {
            if (clip) map[name] = mixer.clipAction(cloneClip(clip), clone)
        })

        // FBX animations as fallback
        Object.keys(ANIMATIONS).forEach((key, i) => {
            const clip = fbxAnimations[i]
            if (clip && !map[key]) map[key] = mixer.clipAction(cloneClip(clip), clone)
        })

        return map
    }, [mixer, clone, fbxAnimations, ANIMATIONS, modelAnimationMap])

    useEffect(() => {
        if (onActions && actions) onActions(actions)
    }, [actions, onActions])

    useEffect(() => {
        if (!clone) return
        const newMixer = new AnimationMixer(clone)
        setMixer(newMixer)
        return () => {
            try {
                newMixer.stopAllAction()
                newMixer.uncacheRoot(newMixer.getRoot())
                if (newMixer.uncacheClip) {
                    ;[...fbxAnimations, ...(modelAnimations || [])].forEach((clip) => {
                        try { newMixer.uncacheClip(clip) } catch { }
                    })
                }
            } catch { }
            prevActionRef.current = null
            lastKeyRef.current = undefined
        }
    }, [clone])

    useEffect(() => {
        if (!thisAnimation || !mixer) return

        const animationKey = typeof thisAnimation === 'string' ? thisAnimation : thisAnimation[0]
        if (!animationKey || lastKeyRef.current === animationKey) return

        // Handle reversed animations (no separate animation files needed)
        // walkRight -> walkLeft reversed, walkBack -> walk reversed, runBack -> run reversed
        const reverseAnimationMap: Record<string, string> = {
            walkRight: 'walkLeft',
            walkBack: 'walk',
            runBack: 'run'
        }
        const isReversed = animationKey in reverseAnimationMap
        const lookupKey = isReversed ? reverseAnimationMap[animationKey] : animationKey

        const next = actions[lookupKey] ?? actions[lookupKey.toLowerCase()] ?? actions.idle ?? actions[Object.keys(actions)[0]]
        if (!next) return

        const prev = prevActionRef.current
        next.clampWhenFinished = true

        // Reverse animation for mapped animations, restore normal direction for others
        next.timeScale = isReversed ? -1 : (next.timeScale < 0 ? 1 : next.timeScale)

        try { if (prev && prev !== next) prev.fadeOut(0.2) } catch { }
        try { next.reset().setLoop(LoopRepeat, 1000).fadeIn(0.2).play() } catch { }

        prevActionRef.current = next
        lastKeyRef.current = animationKey
    }, [thisAnimation, actions])

    return useMemo(() => ({
        thisAnimation,
        setThisAnimation,
        mixer,
        setMixer,
        actions,
    }), [thisAnimation, mixer, actions])
}
