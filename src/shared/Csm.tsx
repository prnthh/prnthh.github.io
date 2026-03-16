import { useRef, useLayoutEffect, useMemo, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { DirectionalLight, DirectionalLightHelper, Vector3, OrthographicCamera, CameraHelper } from 'three'
import { CSMShadowNode } from 'three/addons/csm/CSMShadowNode.js'
import { Helper } from '@react-three/drei'
import { LAYER_SHADOW_ONLY } from '@/shared/util/layers'

export function Csm({
    debug = false,
    children,
    cascades = 4,
    maxFar = 1000,
    mode = 'practical' as 'uniform' | 'logarithmic' | 'practical',
    lightDirection = [-1, -1, -1],
    lightIntensity = 3.0,
    shadowMapSize = 4096,
    shadowNear = 1,
    shadowFar = 300,
    shadowBias = -0.0005,
    followCamera = true,
    snapStep = 8,
    ...props
}: {
    debug?: boolean
    children?: React.ReactNode
    cascades?: number
    maxFar?: number
    mode?: 'uniform' | 'logarithmic' | 'practical'
    lightDirection?: [number, number, number]
    lightIntensity?: number
    shadowMapSize?: number
    shadowNear?: number
    shadowFar?: number
    shadowBias?: number
    /** Move the shadow region to follow the camera (default true) */
    followCamera?: boolean
    /** Grid size for quantized light movement — larger = less frequent jumps (default 8) */
    snapStep?: number
}) {
    const lightRef = useRef<DirectionalLight>(null)
    const shadowCameraRef = useRef<OrthographicCamera>(null)
    const { camera } = useThree()

    // Track the last snapped position so we only update on grid crossings
    const lastSnapped = useRef(new Vector3())

    // Allow the shadow camera to see LAYER_SHADOW_ONLY objects (e.g. first-person player mesh)
    useEffect(() => {
        if (!lightRef.current) return
        lightRef.current.shadow.camera.layers.enable(LAYER_SHADOW_ONLY)
    }, [])

    const csm = useMemo(() => {
        if (!lightRef.current) return null

        const csmShadowNode = new CSMShadowNode(lightRef.current, {
            cascades,
            maxFar,
            mode
        })

        return csmShadowNode
    }, [cascades, maxFar, mode])

    useLayoutEffect(() => {
        if (csm) {
            if (lightRef.current) {
                lightRef.current.shadow.shadowNode = csm
                csm.camera = camera
                csm.updateFrustums()
            }

            csm.maxFar = maxFar
            csm.mode = mode

            csm.updateFrustums()
        }
    }, [csm, camera])

    // Sync the shadow camera ref with the actual shadow camera
    useLayoutEffect(() => {
        if (lightRef.current && shadowCameraRef.current) {
            shadowCameraRef.current = lightRef.current.shadow.camera as OrthographicCamera
        }
    }, [])

    const normalizedDirection = useMemo(() => {
        return new Vector3(...lightDirection).normalize().multiplyScalar(-50)
    }, [lightDirection])

    // Follow camera in quantized steps to keep shadows around the player
    useFrame(() => {
        if (!followCamera || !lightRef.current) return

        const camPos = camera.position
        const snappedX = Math.round(camPos.x / snapStep) * snapStep
        const snappedZ = Math.round(camPos.z / snapStep) * snapStep

        if (snappedX !== lastSnapped.current.x || snappedZ !== lastSnapped.current.z) {
            lastSnapped.current.set(snappedX, 0, snappedZ)

            // Offset the light position so it aims at the snapped camera location
            lightRef.current.position.set(
                snappedX + normalizedDirection.x,
                normalizedDirection.y,
                snappedZ + normalizedDirection.z
            )
            lightRef.current.target.position.set(snappedX, 0, snappedZ)
            lightRef.current.target.updateMatrixWorld()

            if (csm) {
                csm.updateFrustums()
            }
        }
    })

    return (
        <>
            <directionalLight
                ref={lightRef}
                position={normalizedDirection}
                intensity={lightIntensity}
                castShadow
                shadow-mapSize-width={shadowMapSize}
                shadow-mapSize-height={shadowMapSize}
                shadow-bias={shadowBias}
            // shadow-radius={2}
            >
                {debug && <Helper type={DirectionalLightHelper} />}
                <orthographicCamera
                    attach="shadow-camera"
                    ref={shadowCameraRef}
                    near={shadowNear}
                    far={shadowFar}
                    top={20}
                    bottom={-20}
                    left={-20}
                    right={20}
                >
                    {debug && <Helper type={CameraHelper} />}
                </orthographicCamera>
            </directionalLight>
            <group {...props}>
                {children}
            </group>
        </>
    )
}
