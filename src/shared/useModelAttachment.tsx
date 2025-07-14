import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Mesh, type MeshPhysicalMaterial, type Object3D, type Object3DEventMap, type Vector3 } from 'three'
import { DRACOLoader, GLTFLoader, SkeletonUtils } from 'three/examples/jsm/Addons.js'

export default function useModelAttachment(
    clone: Object3D<Object3DEventMap> | undefined,
    attachpoint: string,
    key: string,
    model?: string,
    offset?: Vector3,
    scale?: Vector3,
    rotation?: Vector3,
) {
    const [loadedModel, setLoadedModel] = useState<Object3D>()
    const dracoloader = new DRACOLoader()
    // Track the latest request id
    const requestIdRef = useRef(0)

    // Track all models ever attached by this hook instance
    const attachedModelsRef = useRef<Set<Object3D>>(new Set())

    const ALL_ATTACHPOINTS = [
        'mixamorigHead',
        'mixamorigRightHand',
        'mixamorigLeftHand',
        // Add any other possible attachpoints here
    ]

    // Only remove children whose name starts with 'attachment-'
    function nukeAllAttachments(clone: Object3D<Object3DEventMap>) {
        if (!clone) return
        for (const ap of ALL_ATTACHPOINTS) {
            const bone = clone.getObjectByName(ap)
            if (bone) {
                for (let i = bone.children.length - 1; i >= 0; i--) {
                    const child = bone.children[i]
                    if (child.name.startsWith('attachment-')) {
                        bone.remove(child)
                    }
                }
            }
        }
    }

    useEffect(() => {
        if (!clone || !model) return
        nukeAllAttachments(clone)

        const bone = clone.getObjectByName(attachpoint)
        console.log('useModelAttachment', attachpoint, key, model, bone)
        if (!bone) return

        if (model && (model.includes('undefined') || model.includes('None'))) return

        let modelClone: Object3D | undefined
        const loader = new GLTFLoader()
        dracoloader.setDecoderPath('/resources/draco/')
        loader.setDRACOLoader(dracoloader)

        // Increment requestId for this load
        const thisRequestId = ++requestIdRef.current

        loader.load(model, (originalModel) => {
            if (requestIdRef.current !== thisRequestId) return
            nukeAllAttachments(clone)
            modelClone = SkeletonUtils.clone(originalModel.scene)
            modelClone.name = `attachment-${attachpoint}-${key}`
            setLoadedModel(modelClone)
            attachedModelsRef.current.add(modelClone)
        })
        return () => {
            dracoloader.dispose()
            nukeAllAttachments(clone)
            setLoadedModel(undefined)
        }
    }, [model, attachpoint, clone, key])

    const matRef = useRef<MeshPhysicalMaterial | undefined>(undefined)

    useFrame(() => {
        // move the material texture offset to animate the texture
        if (matRef.current?.emissiveMap) {
            matRef.current.emissiveMap.offset.y -= 0.001
        }
    })

    useEffect(() => {
        if (!loadedModel || !clone) return

        if (model?.includes('Matrix'))
            loadedModel.traverse((child) => {
                if (child instanceof Mesh) {
                    if (child.name === 'hat') {
                        console.log('found mat1', child.material)
                        matRef.current = child.material
                    }
                }
            })

        const bone = clone.getObjectByName(attachpoint)
        if (bone) {
            loadedModel.name = `attachment-${attachpoint}-${key}`
            loadedModel.position.set(offset?.x || 0, offset?.y || 0, offset?.z || 0)
            loadedModel.scale.set(scale?.x || 1, scale?.y || 1, scale?.z || 1)
            loadedModel.rotation.set(rotation?.x || 0, rotation?.y || 0, rotation?.z || 0)
            bone.add(loadedModel)
        }
    }, [loadedModel, offset, scale, rotation])

    return { loadedModel, setLoadedModel }
}
