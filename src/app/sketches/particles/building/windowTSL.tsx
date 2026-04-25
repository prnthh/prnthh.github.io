"use client"

import { useTexture } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import {
    abs, add, sub, mul, div, max, min, step, mix, clamp, length, normalize,
    vec2, vec3, vec4, float as tslFloat, texture as tslTexture, uv as tslUv,
    positionLocal, cameraPosition
} from 'three/tsl'

// Helper function to create a range of numbers
const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i)

/**
 * TSL Helper Functions
 */

// SDF for a square
const sdfSquare = (uvNode: any, size: any, offset: any) => {
    const d = vec2(abs(sub(uvNode, offset)).sub(size))
    const maxD = max(d.x, d.y)
    return add(
        length(max(d, vec2(0.0, 0.0))),
        min(maxD, tslFloat(0.0))
    )
}

const WindowTSL = ({
    size = [2, 2, 1],
    position = [0, 1, 5],
    rotation = [0, -Math.PI, 0],
    wallTexture = '/textures/cubemap-faces2.webp',
    textures = ['/textures/image1.png', null, '/textures/image2.png', '/textures/image3.png']
}: {
    size?: [number, number, number]
    position?: [number, number, number]
    rotation?: [number, number, number]
    wallTexture?: string
    textures?: (string | null)[]
}) => {
    const meshRef = useRef<THREE.Mesh | null>(null)
    const [worldPosition, setWorldPosition] = useState(new THREE.Vector3(0, 0, 0))

    // Process textures list: separate actual texture paths from nulls
    const textureList = useMemo(() => {
        return textures.map((tex, idx) => ({
            path: tex,
            index: idx,
            depth: idx / (textures.length - 1) // Fractional depth from 0 to 1
        }))
    }, [textures])

    // Extract only non-null texture paths for loading
    const texturePaths = useMemo(() =>
        textures.filter((tex): tex is string => tex !== null),
        [textures]
    )

    // Load textures
    const cubemap_albedo = useTexture(wallTexture)
    const loadedTextures = useTexture(texturePaths)

    // Update world position
    useEffect(() => {
        if (meshRef.current) {
            const pos = meshRef.current.getWorldPosition(new THREE.Vector3())
            setWorldPosition(pos)
        }
    }, [meshRef.current])

    const rotationMatrix = useMemo(() => {
        const [rx, ry, rz] = rotation
        const [cx, sx] = [Math.cos(rx), Math.sin(rx)]
        const [cy, sy] = [Math.cos(ry), Math.sin(ry)]
        const [cz, sz] = [Math.cos(rz), Math.sin(rz)]

        return new THREE.Matrix3().set(
            cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz,
            cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz,
            -sy, sx * cy, cx * cy
        )
    }, [rotation])

    // Create TSL material
    const material = useMemo(() => {
        const mat = new THREE.MeshBasicNodeMaterial()
        mat.transparent = true

        try {
            // === INTERIOR CUBE MAPPING ===
            const roomDepth = tslFloat(size[2])
            const invRot = rotationMatrix.clone().invert().elements
            const camRel = sub(cameraPosition, vec3(worldPosition.x, worldPosition.y, worldPosition.z))

            // Transform camera to local space
            const camLocal = vec3(
                add(add(mul(tslFloat(invRot[0]), camRel.x), mul(tslFloat(invRot[3]), camRel.y)), mul(tslFloat(invRot[6]), camRel.z)),
                add(add(mul(tslFloat(invRot[1]), camRel.x), mul(tslFloat(invRot[4]), camRel.y)), mul(tslFloat(invRot[7]), camRel.z)),
                add(add(mul(tslFloat(invRot[2]), camRel.x), mul(tslFloat(invRot[5]), camRel.y)), mul(tslFloat(invRot[8]), camRel.z))
            )

            // Ray-box intersection
            const rayDir = sub(positionLocal, camLocal)
            const t1 = mul(sub(vec3(-1, -1, mul(roomDepth, -2)), camLocal), div(vec3(1, 1, 1), rayDir))
            const t2 = mul(sub(vec3(1, 1, 0), camLocal), div(vec3(1, 1, 1), rayDir))
            const hit = add(camLocal, mul(rayDir, min(min(max(t1.x, t2.x), max(t1.y, t2.y)), max(t1.z, t2.z))))

            // Face detection & normalized hit coords
            const eps = 0.001
            const hitNorm = vec3(
                mul(add(hit.x, 1), 0.5),
                mul(add(hit.y, 1), 0.5),
                mul(add(hit.z, mul(roomDepth, 2)), div(0.5, roomDepth))
            )

            const [hitMinX, hitMaxX] = [step(abs(add(hit.x, 1)), eps), step(abs(sub(hit.x, 1)), eps)]
            const [hitMinY, hitMaxY] = [step(abs(add(hit.y, 1)), eps), step(abs(sub(hit.y, 1)), eps)]
            const hitMinZ = step(abs(add(hit.z, mul(roomDepth, 2))), eps)

            // Compute face UV and map to cubemap atlas (3x2 grid)
            const uvX = vec2(hitNorm.z, hitNorm.y), uvY = vec2(hitNorm.x, hitNorm.z), uvZ = vec2(hitNorm.x, hitNorm.y)
            const faceUv = clamp(mix(mix(uvZ, uvX, max(hitMinX, hitMaxX)), uvY, max(hitMinY, hitMaxY)), vec2(0, 0), vec2(1, 1))

            const third = tslFloat(1 / 3), half = tslFloat(0.5)
            const cmUv = mix(
                mix(
                    mix(
                        mix(
                            mix(vec2(add(mul(faceUv.x, third), mul(third, 2)), mul(faceUv.y, half)), vec2(mul(faceUv.x, third), mul(faceUv.y, half)), hitMaxX),
                            vec2(add(mul(faceUv.x, third), third), mul(faceUv.y, half)), hitMaxY
                        ),
                        vec2(mul(faceUv.x, third), add(mul(faceUv.y, half), half)), hitMinX
                    ),
                    vec2(add(mul(faceUv.x, third), third), add(mul(faceUv.y, half), half)), hitMinY
                ),
                vec2(add(mul(faceUv.x, third), mul(third, 2)), add(mul(faceUv.y, half), half)), hitMinZ
            )

            const cubemapColor = tslTexture(cubemap_albedo, cmUv)

            // === PARALLAX MAPPING ===
            const parallaxUv = sub(tslUv(), vec2(0.5, 0.5))
            const viewDirLocal = normalize(sub(camLocal, positionLocal))
            const perspectiveScale = vec2(
                div(viewDirLocal.x, max(abs(viewDirLocal.z), tslFloat(0.2))),
                div(viewDirLocal.y, max(abs(viewDirLocal.z), tslFloat(0.2)))
            )
            const squareSize = vec2(tslFloat(size[0] * 0.25), tslFloat(size[0] * 0.25))

            // Start with cubemap background
            let finalColorRgb = cubemapColor.rgb
            let finalColorAlpha = cubemapColor.a

            // Prepare texture items (back-to-front)
            const texArray = Array.isArray(loadedTextures) ? loadedTextures : [loadedTextures]
            const validItems = textureList
                .map((item, idx) => {
                    if (!item.path) return null
                    const texIdx = textureList.slice(0, idx + 1).filter(t => t.path).length - 1
                    return { depth: item.depth, texIdx }
                })
                .filter(Boolean)
                .sort((a, b) => b!.depth - a!.depth)

            // Render layers
            validItems.forEach((item) => {
                if (!item) return
                const tex = texArray[item.texIdx]
                if (!tex) return

                const offset = mul(tslFloat(item.depth), perspectiveScale)
                const shape = sdfSquare(parallaxUv, squareSize, offset)
                const texUv = clamp(
                    div(add(sub(parallaxUv, offset), squareSize), mul(squareSize, tslFloat(2))),
                    vec2(0, 0), vec2(1, 1)
                )
                const texColor = tslTexture(tex, texUv)
                const mask = sub(tslFloat(1), step(tslFloat(0), shape))
                const blend = mul(texColor.a, mask)
                finalColorRgb = mix(finalColorRgb, texColor.rgb, blend)
                finalColorAlpha = mix(finalColorAlpha, tslFloat(1), blend)
            })

            mat.colorNode = vec4(finalColorRgb, finalColorAlpha)
            mat.opacityNode = finalColorAlpha

        } catch (error) {
            console.error('Error creating TSL window material:', error)
            // Fallback to simple color
            mat.colorNode = vec4(1, 0, 1, 1) // Magenta for debugging
        }

        return mat
    }, [cubemap_albedo, loadedTextures, textureList, size, worldPosition, rotationMatrix])

    return (
        <mesh ref={meshRef} position={position} rotation={rotation}>
            <planeGeometry args={size} />
            <primitive object={material} attach="material" />
        </mesh>
    )
}

const WindowsInCircle = ({
    position,
    count = 8,
    radius = 5
}: {
    position: [number, number, number]
    count?: number
    radius?: number
}) => {
    return (
        <group position={position}>
            {range(0, count).map((i) => {
                const angle = (i / count) * Math.PI * 2
                const x = Math.cos(angle) * radius
                const z = Math.sin(angle) * radius

                return <WindowTSL key={i} position={[x, 1, z]} rotation={[0, -angle - Math.PI / 2, 0]} />
            })}
        </group>
    )
}

export default WindowTSL
export { WindowsInCircle }
