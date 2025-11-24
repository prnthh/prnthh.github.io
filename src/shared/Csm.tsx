import { useRef, useState, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import CSM from 'three-csm'
import { Group, Vector3, Mesh } from 'three'

export function Csm({ children, update = true, cascades = 4, shadowMapSize = 1024, lightDirection = [10, 10, 5], ...props }: {
    children: React.ReactNode
    update?: boolean
    cascades?: number
    shadowMapSize?: number
    lightDirection?: [number, number, number]
    props?: React.ComponentProps<'group'>
}) {
    const ref = useRef<Group>(null)
    const { scene: parent, camera } = useThree()
    const [csm] = useState(
        () =>
            new CSM({
                camera,
                parent,
                maxFar: camera.far || 250,
                cascades: 3,
                shadowMapSize: 2048,
                lightDirection: new Vector3(1, -1, 1).normalize(),
                // lightFar: 5000,
                // lightNear: 1,
                shadowBias: 0
            })
    )

    /*useLayoutEffect(() => {
    // How to update props in CSM ???
    Object.assign(csm, {
    cascades,
    shadowMapSize,
    lightDirection: new THREE.Vector3(...lightDirection).normalize()
    })
    }, [cascades, shadowMapSize, ...lightDirection])*/

    useLayoutEffect(() => {
        ref.current?.traverse((obj) => {
            if (obj instanceof Mesh && obj.material) csm.setupMaterial(obj.material)
        })
    })

    useFrame(({ }) => {
        if (update) {
            csm.update()
        }
    })

    return <group ref={ref} {...props}>
        {children}
    </group>
}
