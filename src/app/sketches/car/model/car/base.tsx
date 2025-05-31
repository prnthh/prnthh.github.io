import { Collider } from '@dimforge/rapier3d-compat'
import { useKeyboardControls, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody, useRapier } from '@react-three/rapier'
import { RefObject, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { WheelInfo, useVehicleController } from './vehicleController'
import { FollowCam } from '@/shared/FollowCam'
import { useControlScheme } from '@/shared/ControlsProvider'
import { SkeletonUtils } from 'three/examples/jsm/Addons.js'

const spawn = {
    position: [-7, 2, -130] as THREE.Vector3Tuple,
    rotation: [0, 0, 0] as THREE.Vector3Tuple,
}

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

const Vehicle = ({ driving = true, debug = false }) => {
    const { world, rapier } = useRapier()
    const threeControls = useThree((s) => s.controls)
    const [, getKeyboardControls] = useKeyboardControls()
    const { scheme, setScheme } = useControlScheme(); // added

    useEffect(() => {
        if (driving) setScheme("drive");
    }, [driving, setScheme]);

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

    // Load chassis and wheel models
    const chassisGLTF = useGLTF('/models/cars/taxi/chassis.glb');
    // const chassisGLTF = useGLTF('/models/milady.glb');
    const wheelGLTF = useGLTF('/models/cars/taxi/wheel.glb');

    // Clone chassis and wheel using SkeletonUtils
    const chassisCloneRef = useRef<THREE.Object3D>(null)
    const wheelCloneRef = useRef<THREE.Object3D>(null)
    useEffect(() => {
        if (chassisGLTF.scene && !chassisCloneRef.current) {
            const clone = SkeletonUtils.clone(chassisGLTF.scene)
            // Ensure all meshes in the chassis cast shadows
            clone.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true
                }
            })
            chassisCloneRef.current = clone
        }
        if (wheelGLTF.scene && !wheelCloneRef.current) {
            wheelCloneRef.current = SkeletonUtils.clone(wheelGLTF.scene)
        }
    }, [chassisGLTF.scene, wheelGLTF.scene])

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

        const engineForce = Number(controls.forward) * accelerateForce - Number(controls.backward)

        controller.setWheelEngineForce(2, -engineForce)
        controller.setWheelEngineForce(3, -engineForce)

        const wheelBrake = Number(controls.brake) * brakeForce
        controller.setWheelBrake(0, wheelBrake)
        controller.setWheelBrake(1, wheelBrake)
        controller.setWheelBrake(2, wheelBrake)
        controller.setWheelBrake(3, wheelBrake)

        const currentSteering = controller.wheelSteering(0) || 0
        const steerDirection = Number(controls.left) - Number(controls.right)

        const steering = THREE.MathUtils.lerp(currentSteering, steerAngle * steerDirection, 0.5)

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
            const chassis = controller.chassis()
            chassis.setTranslation(new rapier.Vector3(...spawn.position), true)
            const spawnRot = new THREE.Euler(...spawn.rotation)
            const spawnQuat = new THREE.Quaternion().setFromEuler(spawnRot)
            chassis.setRotation(spawnQuat, true)
            chassis.setLinvel(new rapier.Vector3(0, 0, 0), true)
            chassis.setAngvel(new rapier.Vector3(0, 0, 0), true)
        }
    })

    return (
        <>
            <RigidBody
                canSleep={false}
                ref={chasisBodyRef}
                colliders={false}
                type="dynamic"
            >
                <FollowCam height={1.5} />
                <CuboidCollider args={[carDimensions[0] / 2, carDimensions[1] / 2, carDimensions[2] / 2]} />

                {/* chassis */}
                {chassisCloneRef.current && (
                    <primitive position={[0, -0.3, -0.08]} scale={0.44} rotation-y={Math.PI / 2} object={chassisCloneRef.current} ref={chasisMeshRef} castShadow receiveShadow />
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
                            {wheelCloneRef.current && (
                                <primitive position-x={0.09} scale={0.44} rotation-y={Math.PI / 2} object={SkeletonUtils.clone(wheelCloneRef.current)} />
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
}

export default Vehicle