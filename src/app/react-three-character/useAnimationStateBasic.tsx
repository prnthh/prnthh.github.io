import { useEffect, useMemo, useRef, useState } from 'react'
import { type AnimationAction, type AnimationClip, AnimationMixer, LoopRepeat, type Object3D, type Object3DEventMap } from 'three'
import { useLoader } from '@react-three/fiber'
import { FBXLoader } from 'three/examples/jsm/Addons.js'


// when these animation keys are used, we implicitly play the corresponding animation in reverse
const REVERSE_ANIMATION_MAP: Record<string, string> = {
    walkRight: 'walkLeft',
    walkBack: 'walk',
    runBack: 'run',
}

const filterNeckAnimations = (animation: AnimationClip): AnimationClip => {
    const filteredAnimation = animation.clone()
    filteredAnimation.tracks = animation.tracks.filter((track) => !track.name.includes('mixamorigNeck'))
    return filteredAnimation
}

const getTrackNodeName = (trackName: string) => trackName.split('.')[0]

const filterClipForObject = (clip: AnimationClip, object?: Object3D<Object3DEventMap>) => {
    if (!object) return clip

    const nodeNames = new Set<string>()
    object.traverse((node) => {
        if (node.name) nodeNames.add(node.name)
    })

    const filteredClip = clip.clone()
    filteredClip.tracks = clip.tracks.filter((track) => nodeNames.has(getTrackNodeName(track.name)))
    return filteredClip
}

export default function useAnimationState(
    clone?: Object3D<Object3DEventMap>,
    animationOverrides?: { [key: string]: string },
    onActions?: (actions: { [key: string]: AnimationAction }) => void,
    modelAnimations?: AnimationClip[]
) {
    const [thisAnimation, setThisAnimation] = useState<string | string[] | undefined>('idle')
    const prevActionRef = useRef<AnimationAction | null>(null)
    const lastKeyRef = useRef<string | undefined>(undefined)

    const mixer = useMemo(() => clone ? new AnimationMixer(clone) : null, [clone])

    const ANIMATIONS = useMemo(() => ({
        idle: '/models/human/anim/idle.fbx',
        ...(animationOverrides ?? {}),
    }), [animationOverrides])

    const animationPaths = useMemo(() => Object.values(ANIMATIONS), [ANIMATIONS])

    const _loaded = useLoader(FBXLoader, animationPaths)
    const fbxAnimations = useMemo(() =>
        _loaded.map((f) => filterNeckAnimations(f.animations[0])),
        [_loaded]
    )

    const compatibleFbxAnimations = useMemo(() =>
        fbxAnimations.map((clip) => {
            const filteredClip = filterClipForObject(clip, clone)
            return filteredClip.tracks.length > 0 ? filteredClip : null
        }),
        [clone, fbxAnimations]
    )

    const modelAnimationMap = useMemo(() => {
        const map: { [key: string]: AnimationClip } = {}
        modelAnimations?.forEach((clip) => {
            if (!clip.name) return
            const filteredClip = filterClipForObject(filterNeckAnimations(clip), clone)
            if (filteredClip.tracks.length > 0) map[clip.name.toLowerCase()] = filteredClip
        })
        return map
    }, [clone, modelAnimations])

    const actions = useMemo(() => {
        if (!mixer) return {} as { [key: string]: AnimationAction }
        const map: { [key: string]: AnimationAction } = {}

        // Model animations first (built-in)
        Object.entries(modelAnimationMap).forEach(([name, clip]) => {
            if (clip) map[name] = mixer.clipAction(clip, clone)
        })

        // FBX animations as fallback
        Object.keys(ANIMATIONS).forEach((key, i) => {
            const clip = compatibleFbxAnimations[i]
            if (clip && !map[key]) map[key] = mixer.clipAction(clip, clone)
        })

        // Reversed variants need their own actions so they can crossfade cleanly
        // against the forward version instead of mutating the same action in place.
        Object.entries(REVERSE_ANIMATION_MAP).forEach(([reverseKey, baseKey]) => {
            const baseAction = map[baseKey]
            if (!baseAction || map[reverseKey]) return
            const reverseClip = baseAction.getClip().clone()
            reverseClip.name = reverseKey
            map[reverseKey] = mixer.clipAction(reverseClip, clone)
        })

        return map
    }, [mixer, clone, compatibleFbxAnimations, ANIMATIONS, modelAnimationMap])

    useEffect(() => {
        if (onActions && actions) onActions(actions)
    }, [actions, onActions])

    useEffect(() => {
        if (!mixer) return
        return () => {
            try {
                mixer.stopAllAction()
                mixer.uncacheRoot(mixer.getRoot())
            } catch { }
            prevActionRef.current = null
            lastKeyRef.current = undefined
        }
    }, [mixer])

    useEffect(() => {
        if (!thisAnimation || !mixer) return

        const animationKey = typeof thisAnimation === 'string' ? thisAnimation : thisAnimation[0]
        if (!animationKey) return

        const isReversed = animationKey in REVERSE_ANIMATION_MAP
        const next = actions[animationKey] ?? actions[animationKey.toLowerCase()] ?? actions.idle ?? actions[Object.keys(actions)[0]]
        if (!next) return
        if (lastKeyRef.current === animationKey && prevActionRef.current === next) return

        const prev = prevActionRef.current
        next.clampWhenFinished = true

        // Reverse animation for mapped animations, restore normal direction for others
        next.timeScale = isReversed ? -1 : (next.timeScale < 0 ? 1 : next.timeScale)

        try { if (prev && prev !== next) prev.fadeOut(0.2) } catch { }
        try {
            next.reset().setLoop(LoopRepeat, 1000).fadeIn(0.2)
            next.time = isReversed ? next.getClip().duration : 0
            next.play()
        } catch { }

        prevActionRef.current = next
        lastKeyRef.current = animationKey
    }, [thisAnimation, actions, mixer])

    return useMemo(() => ({
        thisAnimation,
        setThisAnimation,
        mixer,
        actions,
    }), [thisAnimation, mixer, actions])
}
