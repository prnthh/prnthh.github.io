import { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat'
import { RapierRigidBody, useAfterPhysicsStep, useRapier } from '@react-three/rapier'
import { RefObject, useEffect, useRef } from 'react'
import { Object3D, Quaternion, Vector3 } from 'three'

const up = new Vector3(0, 1, 0)

const _wheelSteeringQuat = new Quaternion()
const _wheelRotationQuat = new Quaternion()

export type WheelInfo = {
    axleCs: Vector3
    suspensionRestLength: number
    suspensionStiffness: number
    maxSuspensionTravel: number
    position: Vector3
    radius: number
}

export const useVehicleController = (
    chassisRef: RefObject<RapierRigidBody | null>,
    wheelsRef: RefObject<(Object3D | null)[]>,
    wheelsInfo: WheelInfo[],
) => {
    const { world } = useRapier()

    const vehicleController = useRef<DynamicRayCastVehicleController | null>(null)

    useEffect(() => {
        if (!chassisRef || !wheelsRef) return;
        const chassis = chassisRef.current;
        const wheels = wheelsRef.current;

        if (!chassis || !wheels) return

        const vehicle = world.createVehicleController(chassis)
        vehicle.setIndexForwardAxis = 2

        const suspensionDirection = new Vector3(0, -1, 0)

        wheelsInfo.forEach((wheel) => {
            vehicle.addWheel(wheel.position, suspensionDirection, wheel.axleCs, wheel.suspensionRestLength, wheel.radius)
        })

        wheelsInfo.forEach((wheel, index) => {
            vehicle.setWheelSuspensionStiffness(index, wheel.suspensionStiffness)
            vehicle.setWheelMaxSuspensionTravel(index, wheel.maxSuspensionTravel)
        })
        vehicle.wheelFrictionSlip(1)

        vehicleController.current = vehicle

        return () => {
            vehicleController.current = null
            world.removeVehicleController(vehicle)
        }
    }, [])

    useAfterPhysicsStep((world) => {
        if (!vehicleController.current) return

        const controller = vehicleController.current

        controller.updateVehicle(world.timestep)

        const { current: wheels } = wheelsRef

        wheels?.forEach((wheel, index) => {
            if (!wheel) return;
            const wheelAxleCs = controller.wheelAxleCs(index)!
            const connection = controller.wheelChassisConnectionPointCs(index)?.y || 0
            const suspension = controller.wheelSuspensionLength(index) || 0
            const steering = controller.wheelSteering(index) || 0
            const rotationRad = controller.wheelRotation(index) || 0

            wheel.position.y = connection - suspension

            _wheelSteeringQuat.setFromAxisAngle(up, steering)
            _wheelRotationQuat.setFromAxisAngle(wheelAxleCs, rotationRad)

            wheel.quaternion.multiplyQuaternions(_wheelSteeringQuat, _wheelRotationQuat)
        })
    })

    return {
        vehicleController,
    }
}