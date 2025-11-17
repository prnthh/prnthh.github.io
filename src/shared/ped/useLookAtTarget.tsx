import { useFrame } from '@react-three/fiber'
import { type RefObject, useEffect, useRef } from 'react'
import {
    Object3D,
    type Object3DEventMap,
    Vector3,
    Bone
} from 'three'

export default function useLookAtTarget(
    clone?: Object3D<Object3DEventMap>,
    lookAtTarget?: RefObject<Object3D<Object3DEventMap> | null>,
    neckBoneName = 'mixamorigNeck',
    enabled: boolean = true,
    config: { maxRotation: number; lerpSpeed?: number } = { maxRotation: Math.PI / 2, lerpSpeed: 0.15 },
) {
    const neckBoneRef = useRef<Bone | null>(null)

    useEffect(() => {
        if (!clone) return
        clone.traverse((obj) => {
            if (obj.name === neckBoneName && obj instanceof Bone) {
                neckBoneRef.current = obj
            }
        })
    }, [clone, neckBoneName])

    useFrame(() => {
        const neck = neckBoneRef.current
        const target = lookAtTarget?.current
        if (!neck || !enabled || !target) return

        const targetPos = target.getWorldPosition(new Vector3()).add(new Vector3(0, 0.5, 0))
        neck.lookAt(targetPos)
    })

    return { neckBone: neckBoneRef.current }
}
