import { Collider } from '@dimforge/rapier3d-compat'
import { useGLTF, Box, Cylinder } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier'
import { RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as THREE from 'three'
import { WheelInfo, useVehicleController } from './vehicleController'
import FollowCam from '@/shared/cameras/FollowCam'
import { SkeletonUtils } from 'three/examples/jsm/Addons.js'
import React from 'react'
import useInputStore from '@/app/react-three-controller/controls/InputStore'

const wheelInfo: Omit<WheelInfo, 'position'> = {
    axleCs: new THREE.Vector3(1, 0, 0),
    suspensionRestLength: 0.25,
    suspensionStiffness: 48,
    maxSuspensionTravel: 0.1,
    radius: 0.15,
}

const carDimensions = [0.8, 0.4, 1.8] as const
const axelZOffset = 0.25
const axelYOffset = 0.25
const wheelSize = [0.15, 0.18] as const

const wheels: WheelInfo[] = [
    // front
    { position: new THREE.Vector3((carDimensions[0] / 2), -(carDimensions[1] / 2) + axelYOffset, (carDimensions[2] / 2) - axelZOffset), ...wheelInfo },
    { position: new THREE.Vector3(-(carDimensions[0] / 2), -(carDimensions[1] / 2) + axelYOffset, (carDimensions[2] / 2) - axelZOffset), ...wheelInfo },
    // rear
    { position: new THREE.Vector3(-(carDimensions[0] / 2), -(carDimensions[1] / 2) + axelYOffset, -(carDimensions[2] / 2) + axelZOffset), ...wheelInfo },
    { position: new THREE.Vector3((carDimensions[0] / 2), -(carDimensions[1] / 2) + axelYOffset, -(carDimensions[2] / 2) + axelZOffset), ...wheelInfo },
]

const _airControlAngVel = new THREE.Vector3()


export type ObjectRef = {
    rbRef: RapierRigidBody | null
    meshRef: THREE.Group | THREE.Object3D | null
}


// Convert Vehicle to forwardRef with robust ref handling
const Vehicle = React.forwardRef<ObjectRef, {
    name?: string,
    driving?: boolean,
    debug?: boolean,
    chassisModel?: string,
    wheelModel?: string,
    spawn?: { position: THREE.Vector3Tuple, rotation: THREE.Vector3Tuple },
    children?: React.ReactNode
}>(({
    name = 'bobcar', driving = true, debug = false, chassisModel, wheelModel,
    spawn = {
        position: [0, 0, 0] as THREE.Vector3Tuple,
        rotation: [0, 0, 0] as THREE.Vector3Tuple,
    },
    children
}, ref) => {
    const { world, rapier } = useRapier()
    const threeControls = useThree((s) => s.controls)

    const chasisMeshRef = useRef<THREE.Mesh>(null!)
    const chasisBodyRef = useRef<RapierRigidBody>(null!)
    const wheelsRef: RefObject<(THREE.Object3D | null)[]> = useRef([])

    const { vehicleController } = useVehicleController(chasisBodyRef, wheelsRef as RefObject<THREE.Object3D[]>, wheels)

    const { accelerateForce, brakeForce, steerAngle } = {
        accelerateForce: 1,
        brakeForce: 0.05,
        steerAngle: Math.PI / 12,
    }

    const ground = useRef<Collider | null>(null)
    const lastTapSignal = useRef<number>(0)

    useFrame((state, delta) => {
        if (!driving) return;
        if (!chasisMeshRef.current || !vehicleController.current || !!threeControls) return

        const t = 1.0 - Math.pow(0.01, delta)

        /* controls */

        const controller = vehicleController.current

        const chassisRigidBody = controller.chassis()

        // Get input from the input store
        const vertical = useInputStore.getState().vertical
        const horizontal = useInputStore.getState().horizontal
        const brake = useInputStore.getState().aim // Space bar / aim button
        const tapSignal = useInputStore.getState().tapSignal

        // Check if tap signal changed (reset was triggered)
        const shouldReset = tapSignal !== lastTapSignal.current
        if (shouldReset) {
            lastTapSignal.current = tapSignal
        }

        // rough ground check
        let outOfBounds = false

        const ray = new rapier.Ray(chassisRigidBody.translation(), { x: 0, y: -1, z: 0 })

        const raycastResult = world.castRay(ray, 1, false, undefined, undefined, undefined, chassisRigidBody)

        ground.current = null

        if (raycastResult) {
            const collider = raycastResult.collider
            const userData = collider.parent()?.userData as any
            outOfBounds = userData?.outOfBounds

            ground.current = collider
        }

        // Get current speed
        const linvel = chassisRigidBody.linvel();
        const speed = Math.sqrt(linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z);
        const maxSpeed = 15; // meters per second

        let engineForce = vertical * accelerateForce;
        // Clamp engine force if above max speed and still accelerating
        if (speed > maxSpeed && engineForce > 0) {
            engineForce = 0;
        }

        let baseSteerAngle = steerAngle;
        if (speed > maxSpeed / 2) {
            controller.wheelFrictionSlip(0.2)
            baseSteerAngle *= 0.5; // Reduce steering angle at high speeds
        } else {
            controller.wheelFrictionSlip(1.0)
        }

        controller.setWheelEngineForce(2, -engineForce)
        controller.setWheelEngineForce(3, -engineForce)

        const wheelBrake = (brake ? 1 : 0) * brakeForce
        controller.setWheelBrake(0, wheelBrake)
        controller.setWheelBrake(1, wheelBrake)
        controller.setWheelBrake(2, wheelBrake)
        controller.setWheelBrake(3, wheelBrake)

        const currentSteering = controller.wheelSteering(0) || 0
        const steerDirection = -horizontal // Invert horizontal for correct steering

        const steering = THREE.MathUtils.lerp(currentSteering, baseSteerAngle * steerDirection, 0.5)

        controller.setWheelSteering(0, steering)
        controller.setWheelSteering(1, steering)


        // air control
        if (!ground.current) {
            const forwardAngVel = vertical
            const sideAngVel = horizontal

            const angvel = _airControlAngVel.set(0, sideAngVel * t, forwardAngVel * t)
            angvel.applyQuaternion(chassisRigidBody.rotation())
            angvel.add(chassisRigidBody.angvel())

            chassisRigidBody.setAngvel(new rapier.Vector3(angvel.x, angvel.y, angvel.z), true)
        }

        if (shouldReset || outOfBounds) {
            resetVehicle();
        }
    })

    const resetVehicle = () => {
        if (!chasisBodyRef.current) return
        const chassis = chasisBodyRef.current
        chassis.setTranslation(new rapier.Vector3(...spawn.position), true)
        const spawnRot = new THREE.Euler(...spawn.rotation)
        const spawnQuat = new THREE.Quaternion().setFromEuler(spawnRot)
        chassis.setRotation(spawnQuat, true)
        chassis.setLinvel(new rapier.Vector3(0, 0, 0), true)
        chassis.setAngvel(new rapier.Vector3(0, 0, 0), true)
    }

    useImperativeHandle(ref, () => ({
        meshRef: chasisMeshRef.current,
        rbRef: chasisBodyRef.current
    }), [chasisMeshRef.current, chasisBodyRef.current])

    return (
        <>
            <RigidBody
                name={name}
                canSleep={false}
                ref={chasisBodyRef}
                colliders={false}
                position={spawn.position}
                type="dynamic"
            >
                {driving && <FollowCam key={'cam' + name} height={1.5} />}
                <CuboidCollider args={[carDimensions[0] / 2, carDimensions[1] / 2, carDimensions[2] / 2]} />

                {/* chassis */}
                {chassisModel ? (
                    <ChassisModel
                        model={chassisModel}
                        ref={chasisMeshRef}
                        castShadow
                        receiveShadow
                    />
                ) : (
                    <Box args={[carDimensions[0], carDimensions[1], carDimensions[2]]} castShadow receiveShadow ref={chasisMeshRef} />
                )}

                {/* Debug wireframe for chassis */}
                {debug && (
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={carDimensions} />
                        <meshBasicMaterial color="red" wireframe />
                    </mesh>
                )}

                {children}

                {/* wheels */}
                {wheels.map((wheel, index) => (
                    <group key={index} ref={(ref) => ((wheelsRef.current as any)[index] = ref)} position={wheel.position}>
                        <group>
                            {wheelModel ? (
                                <WheelModel
                                    model={wheelModel}
                                />
                            ) : (
                                <Cylinder
                                    args={[wheelInfo.radius, wheelInfo.radius, wheelSize[1], 32]}
                                    rotation-z={Math.PI / 2}
                                    material={new THREE.MeshBasicMaterial({ color: 'black' })}
                                    castShadow
                                    receiveShadow
                                />
                            )}
                        </group>
                        {/* Debug wireframe for wheel */}
                        {debug && (
                            <mesh>
                                <boxGeometry args={[wheelSize[1], wheelInfo.radius * 2, wheelInfo.radius * 2]} />
                                <meshBasicMaterial color="red" wireframe />
                            </mesh>
                        )}
                    </group>
                ))}
            </RigidBody>
        </>
    )
})

export default Vehicle

// --- Model components at the bottom ---

// ChassisModel component
const ChassisModel = ({ model, ...props }: { model: string, [key: string]: any }) => {
    const { scene } = useGLTF(model)
    const [clone, setClone] = useState<THREE.Object3D | null>(null)
    useEffect(() => {
        if (scene) {
            const cloned = SkeletonUtils.clone(scene as unknown as THREE.Object3D)
            cloned.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true
                    child.receiveShadow = true
                }
            })
            setClone(cloned)
        }
    }, [scene])
    if (!clone) return null
    return <primitive object={clone} {...props} />
}

// WheelModel component
const WheelModel = ({ model, ...props }: { model: string, [key: string]: any }) => {
    const { scene } = useGLTF(model)
    const [clone, setClone] = useState<THREE.Object3D | null>(null)
    useEffect(() => {
        if (scene) {
            setClone(SkeletonUtils.clone(scene as unknown as THREE.Object3D))
        }
    }, [scene])
    if (!clone) return null
    return <primitive object={SkeletonUtils.clone(clone)} {...props} />
}