import { useRef, useState, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import CSM from 'three-csm'

interface CsmProps extends React.PropsWithChildren {
  cascades?: number
  shadowMapSize?: number
  lightDirection?: [number, number, number]
  [key: string]: any
}

export function Csm({ children, cascades = 4, shadowMapSize = 1024, lightDirection = [10, 10, 5], ...props }: CsmProps) {
  const ref = useRef<THREE.Group>(null)
  const { scene: parent, camera } = useThree()
  const [csm] = useState(
    () =>
      new CSM({
        camera,
        parent,
        maxFar: camera.far || 250,
        cascades: 3,
        shadowMapSize: 2048,
        lightDirection: new THREE.Vector3(1, -1, 1).normalize(),
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
    if (ref.current) {
      ref.current.traverse((obj) => {
        const material = (obj as THREE.Mesh).material
        if (material) {
          if (Array.isArray(material)) {
            material.forEach((mat) => csm.setupMaterial(mat))
          } else {
            csm.setupMaterial(material)
          }
        }
      })
    }
  })
  useFrame(() => {
    csm.update()
  })
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}
