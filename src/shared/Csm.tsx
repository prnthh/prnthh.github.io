import { useRef, useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { DirectionalLight, DirectionalLightHelper, Vector3, OrthographicCamera, CameraHelper } from 'three'
import { CSMShadowNode } from 'three/addons/csm/CSMShadowNode.js'
import { Helper } from '@react-three/drei'

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
}) {
    const lightRef = useRef<DirectionalLight>(null)
    const shadowCameraRef = useRef<OrthographicCamera>(null)
    const { camera } = useThree()

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
