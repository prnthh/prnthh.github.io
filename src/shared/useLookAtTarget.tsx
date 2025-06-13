import { useFrame } from '@react-three/fiber'
import { Ref, type RefObject, useEffect, useRef } from 'react'
import {
    type Bone,
    type Object3D,
    type Object3DEventMap,
    Vector3,
} from 'three'
import * as THREE from 'three'

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
            if (obj.name === neckBoneName && obj instanceof THREE.Bone) {
                neckBoneRef.current = obj
            }
        })
    }, [clone, neckBoneName])

    useFrame(() => {
        const neck = neckBoneRef.current
        const target = lookAtTarget?.current
        if (!neck || !enabled || !target) return

        // Get world positions
        const neckPos = neck.getWorldPosition(new Vector3())
        const targetPos = target.getWorldPosition(new Vector3()).add(new Vector3(0, 0.5, 0))
        const dir = targetPos.clone().sub(neckPos)
        if (dir.lengthSq() === 0) return

        // Calculate yaw angle to target in world space
        const lookYaw = Math.atan2(dir.x, dir.z)
        // Get parent's world yaw
        const parentQuat = neck.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion()
        const parentYaw = new THREE.Euler().setFromQuaternion(parentQuat, 'YXZ').y
        // Local yaw is the difference
        let localYaw = lookYaw - parentYaw
        // Normalize to [-PI, PI]
        localYaw = THREE.MathUtils.euclideanModulo(localYaw + Math.PI, Math.PI * 2) - Math.PI
        // Clamp to max rotation
        const clampedYaw = THREE.MathUtils.clamp(localYaw, -config.maxRotation, config.maxRotation)
        // Lerp current neck rotation.y to target clampedYaw
        const lerpSpeed = config.lerpSpeed ?? 0.15 // default speed if not provided
        neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, clampedYaw, lerpSpeed)
        neck.rotation.x = 0
        neck.rotation.z = 0
    })

    return { neckBone: neckBoneRef.current }
}
