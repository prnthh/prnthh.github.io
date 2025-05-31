import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Tween, Group as TweenGroup, Easing } from '@tweenjs/tween.js'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const tweenGroup = new TweenGroup()

function Particle({
    emitterPosition,
    size,
    range,
    particle,
    randomRotation,
    scaleFactor,
    initialDelay = 0,
    lifetime = 1000, // default lifetime in ms
    ...props
}: {
    emitterPosition: THREE.Vector3
    size: number
    range: number
    particle: string
    randomRotation: boolean
    scaleFactor: number
    initialDelay?: number
    lifetime?: number
}) {
    const ref = useRef<THREE.Sprite>(null)
    const texture = useTexture(`${particle}`)
    // Add a ref to always have the latest emitterPosition
    const emitterPositionRef = useRef(emitterPosition)
    useEffect(() => {
        emitterPositionRef.current = emitterPosition
    }, [emitterPosition])

    function doMovement() {
        if (!ref.current) return
        // Start bigger and denser at the bottom
        const initialScale = size * 0.7
        ref.current.scale.set(initialScale, initialScale, initialScale)
        // Always use the latest emitterPosition prop via ref
        ref.current.position.copy(getRandomisedPosition(emitterPositionRef.current, range))
        ref.current.material.opacity = 0.7
        const startRot = randomRotation ? Math.random() * Math.PI * 2 : 0
        ref.current.rotation.z = startRot

        const randomDuration = lifetime + (Math.random() - 0.5) * 500
        const startMatRot = Math.random() * Math.PI * 2
        ref.current.material.rotation = startMatRot
        const endMatRot = startMatRot + (Math.random() - 0.5) * Math.PI * 2

        // Main animation tweens with delay chained in
        new Tween(ref.current.position, tweenGroup)
            .to({ y: ref.current.position.y + 5 }, randomDuration)
            .delay(initialDelay)
            .easing(Easing.Linear.None)
            .onComplete(() => doMovement())
            .start()
        new Tween(ref.current.scale, tweenGroup)
            .to(
                { x: size * scaleFactor, y: size * scaleFactor, z: size * scaleFactor },
                randomDuration,
            )
            .delay(initialDelay)
            .easing(Easing.Linear.None)
            .start()
        new Tween(ref.current.material, tweenGroup)
            .to({ opacity: 0 }, randomDuration)
            .delay(initialDelay)
            .easing(Easing.Linear.None)
            .start()
        new Tween(ref.current.material, tweenGroup)
            .to({ rotation: endMatRot }, randomDuration)
            .delay(initialDelay)
            .easing(Easing.Linear.None)
            .start()
    }

    useEffect(() => {
        if (!ref.current) return
        // Set initial position and scale immediately to avoid showing at origin
        ref.current.position.copy(getRandomisedPosition(emitterPositionRef.current, range))
        const initialScale = size * 0.7
        ref.current.scale.set(initialScale, initialScale, initialScale)
        ref.current.material.opacity = 0.7
        doMovement()
        // No timeout or dummy tween needed, all handled by animation chain
    }, [])

    useFrame(() => {
        tweenGroup.update(performance.now())
    })

    return (
        <sprite ref={ref} {...props}>
            <spriteMaterial
                map={texture}
                depthWrite={false}
            />
        </sprite>
    )
}

function getRandomisedPosition(position: THREE.Vector3, range = 0.7) {
    return new THREE.Vector3(
        position.x + rand11() * range,
        position.y + rand11() * range,
        position.z + rand11() * range,
    )
}

const rand11 = () => Math.random() * 2.0 - 1.0

const Smoke = ({
    count,
    size = 2,
    range = 0.7,
    emitterPosition = new THREE.Vector3(),
    particle = '/textures/smoke.png',
    randomRotation = true,
    scaleFactor = 5,
    debug = false,
    lifetime = 5000,
}: {
    count: number
    size?: number
    range?: number
    emitterPosition?: THREE.Vector3
    particle?: string
    randomRotation?: boolean
    scaleFactor?: number
    debug?: boolean
    lifetime?: number
}) => {
    // Gradually increase the number of active particles
    const [activeCount, setActiveCount] = useState(0)
    useEffect(() => {
        if (activeCount >= count) return
        const interval = setInterval(() => {
            setActiveCount((prev) => {
                if (prev < count) return prev + 1
                clearInterval(interval)
                return prev
            })
        }, 300) // Increased interval for slower particle addition
        return () => clearInterval(interval)
    }, [count, activeCount])

    return (
        <group>
            {debug && (
                <>
                    <mesh position={emitterPosition}>
                        <sphereGeometry args={[0.1, 16, 16]} />
                        <meshStandardMaterial color="hotpink" />
                    </mesh>
                    <mesh position={emitterPosition}>
                        <boxGeometry args={[range * 2, range * 2, range * 2]} />
                        <meshStandardMaterial color="red" wireframe />
                    </mesh>
                </>
            )}
            {Array.from({ length: activeCount }).map((_, i) => (
                <Particle
                    particle={particle}
                    key={i}
                    emitterPosition={emitterPosition}
                    size={size}
                    range={range}
                    randomRotation={randomRotation}
                    scaleFactor={scaleFactor}
                    initialDelay={0}
                    lifetime={lifetime}
                />
            ))}
        </group>
    )
}

export default Smoke
