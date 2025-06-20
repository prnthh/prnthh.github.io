import { Collider } from '@dimforge/rapier3d-compat'
import { useKeyboardControls, useGLTF, Box, Cylinder } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier'
import { RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as THREE from 'three'
import { WheelInfo, useVehicleController } from './vehicleController'
import { FollowCam } from '@/shared/FollowCam'
import { useControlScheme } from '@/shared/ControlsProvider'
import { SkeletonUtils } from 'three/examples/jsm/Addons.js'
import React from 'react'

const wheelInfo: Omit<WheelInfo, 'position'> = {
    axleCs: new THREE.Vector3(1, 0, 0),
    suspensionRestLength: 0.25,
    suspensionStiffness: 48,
    maxSuspensionTravel: 1,
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

// Convert Vehicle to forwardRef with robust ref handling
const Vehicle = React.forwardRef<RapierRigidBody, {
    name?: string,
    driving?: boolean,
    debug?: boolean,
    chassisModel?: string,
    wheelModel?: string,
    spawn?: { position: THREE.Vector3Tuple, rotation: THREE.Vector3Tuple }
}>(({ name = 'bob', driving = true, debug = false, chassisModel, wheelModel, spawn = {
    position: [-7, 2, -130] as THREE.Vector3Tuple,
    rotation: [0, 0, 0] as THREE.Vector3Tuple,
} }, ref) => {
    const { world, rapier } = useRapier()
    const threeControls = useThree((s) => s.controls)
    const [, getKeyboardControls] = useKeyboardControls()
    const { scheme, setScheme } = useControlScheme();

    useEffect(() => {
        if (driving) setScheme("drive");
    }, [driving, setScheme]);

    const chasisMeshRef = useRef<THREE.Mesh>(null!)
    // Always use an internal ref
    const internalChasisBodyRef = useRef<RapierRigidBody>(null!)
    const chasisBodyRef: React.RefObject<RapierRigidBody> = internalChasisBodyRef
    const wheelsRef: RefObject<(THREE.Object3D | null)[]> = useRef([])

    const { vehicleController } = useVehicleController(chasisBodyRef, wheelsRef as RefObject<THREE.Object3D[]>, wheels)

    const { accelerateForce, brakeForce, steerAngle } = {
        accelerateForce: 1,
        brakeForce: 0.05,
        steerAngle: Math.PI / 12,
    }

    const ground = useRef<Collider | null>(null)

    useFrame((state, delta) => {
        if (!chasisMeshRef.current || !vehicleController.current || !!threeControls) return

        const t = 1.0 - Math.pow(0.01, delta)

        /* controls */

        const controller = vehicleController.current

        const chassisRigidBody = controller.chassis()

        const controls = getKeyboardControls()
        if (controls.brake === undefined) return

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

        let engineForce = Number(controls.forward) * accelerateForce - Number(controls.backward);
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

        const wheelBrake = Number(controls.brake) * brakeForce
        controller.setWheelBrake(0, wheelBrake)
        controller.setWheelBrake(1, wheelBrake)
        controller.setWheelBrake(2, wheelBrake)
        controller.setWheelBrake(3, wheelBrake)

        const currentSteering = controller.wheelSteering(0) || 0
        const steerDirection = Number(controls.left) - Number(controls.right)

        const steering = THREE.MathUtils.lerp(currentSteering, baseSteerAngle * steerDirection, 0.5)

        controller.setWheelSteering(0, steering)
        controller.setWheelSteering(1, steering)


        // air control
        if (!ground.current) {
            const forwardAngVel = Number(controls.forward) - Number(controls.backward)
            const sideAngVel = Number(controls.left) - Number(controls.right)

            const angvel = _airControlAngVel.set(0, sideAngVel * t, forwardAngVel * t)
            angvel.applyQuaternion(chassisRigidBody.rotation())
            angvel.add(chassisRigidBody.angvel())

            chassisRigidBody.setAngvel(new rapier.Vector3(angvel.x, angvel.y, angvel.z), true)
        }

        if (controls.reset || outOfBounds) {
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

    React.useImperativeHandle(ref, () => internalChasisBodyRef.current)

    return (
        <>
            <RigidBody
                name={name}
                canSleep={false}
                ref={chasisBodyRef}
                colliders={false}
                type="dynamic"
            >
                <FollowCam height={1.5} />
                <CuboidCollider args={[carDimensions[0] / 2, carDimensions[1] / 2, carDimensions[2] / 2]} />

                {/* chassis */}
                {chassisModel ? (
                    <ChassisModel
                        model={chassisModel}
                        position={[0, -0.3, -0.08]}
                        scale={0.44}
                        rotation-y={Math.PI / 2}
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

                {/* wheels */}
                {wheels.map((wheel, index) => (
                    <group key={index} ref={(ref) => ((wheelsRef.current as any)[index] = ref)} position={wheel.position}>
                        <group>
                            {wheelModel ? (
                                <WheelModel
                                    model={wheelModel}
                                    position-x={0.09}
                                    scale={0.44}
                                    rotation-y={Math.PI / 2}
                                />
                            ) : (
                                <Cylinder
                                    args={[wheelInfo.radius, wheelInfo.radius, wheelSize[1], 32]}
                                    rotation-z={Math.PI / 2}
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
    const cloneRef = useRef<THREE.Object3D>(null)
    useEffect(() => {
        if (scene && !cloneRef.current) {
            const clone = SkeletonUtils.clone(scene as unknown as THREE.Object3D)
            clone.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true
                    child.receiveShadow = true
                }
            })
            cloneRef.current = clone
        }
    }, [scene])
    if (!cloneRef.current) return null
    return <primitive object={cloneRef.current} {...props} />
}

// WheelModel component
const WheelModel = ({ model, ...props }: { model: string, [key: string]: any }) => {
    const { scene } = useGLTF(model)
    const cloneRef = useRef<THREE.Object3D>(null)
    useEffect(() => {
        if (scene && !cloneRef.current) {
            cloneRef.current = SkeletonUtils.clone(scene as unknown as THREE.Object3D)
        }
    }, [scene])
    if (!cloneRef.current) return null
    return <primitive object={SkeletonUtils.clone(cloneRef.current)} {...props} />
}