import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import { RefObject, useEffect, useRef } from "react";
import * as THREE from "three";

const WALK_SPEED = 1.0;
const RUN_SPEED = 2.0;
const IDLE_THRESHOLD = 0.51;
const RUN_DISTANCE = 5.0;
const ROTATION_SPEED = 2.5;

const usePhysicsWalk = (
    rigidBodyRef: RefObject<RapierRigidBody | null>,
    setAnimation: any,
    position: [number, number, number] | undefined,
    onDestinationReached?: () => void
) => {
    const target = useRef<number[] | undefined>(undefined);
    const targetReached = useRef(false);

    useEffect(() => {
        const newTarget = position;
        if (JSON.stringify(target.current) !== JSON.stringify(newTarget)) {
            target.current = newTarget;
            targetReached.current = false;
            if (!newTarget) {
                setAnimation("idle");
                if (rigidBodyRef.current) {
                    rigidBodyRef.current.setLinvel({ x: 0, y: rigidBodyRef.current.linvel().y, z: 0 }, true);
                }
            }
        }
    }, [position, rigidBodyRef]);

    const getGroundNormal = () => new THREE.Vector3(0, 1, 0);

    useFrame((_, delta) => {
        const rigidBody = rigidBodyRef.current;
        if (!rigidBody || !target.current || targetReached.current) return;

        const pos = rigidBody.translation();
        const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);
        const targetPos = new THREE.Vector3(target.current[0], target.current[1], target.current[2]);
        const directionToTarget = targetPos.clone().sub(currentPos);
        const distance = directionToTarget.length();

        if (distance <= IDLE_THRESHOLD) {
            rigidBody.setLinvel({ x: 0, y: rigidBody.linvel().y, z: 0 }, true);
            setAnimation("idle");
            targetReached.current = true;
            target.current = undefined;
            if (onDestinationReached) onDestinationReached();
            return;
        }

        const groundNormal = getGroundNormal();
        const projectedDir = directionToTarget.clone().projectOnPlane(groundNormal).normalize();
        const lookAt = currentPos.clone().sub(projectedDir);
        const m = new THREE.Matrix4().lookAt(currentPos, lookAt, groundNormal);
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);

        const currentRotation = rigidBody.rotation();
        const currentQuat = new THREE.Quaternion(
            currentRotation.x,
            currentRotation.y,
            currentRotation.z,
            currentRotation.w
        );
        const t = ROTATION_SPEED * delta;
        const rotatedQuat = currentQuat.clone().slerp(targetQuat, t);
        rigidBody.setRotation(rotatedQuat, true);

        const angleThreshold = THREE.MathUtils.degToRad(30);
        const facingAngle = rotatedQuat.angleTo(targetQuat);

        if (facingAngle < angleThreshold) {
            const speed = distance > RUN_DISTANCE ? RUN_SPEED : WALK_SPEED;
            const velocity = projectedDir.clone().multiplyScalar(speed);
            rigidBody.setLinvel(
                { x: velocity.x, y: rigidBody.linvel().y, z: velocity.z },
                true
            );
            setAnimation(speed === RUN_SPEED ? "run" : "walk");
        } else {
            rigidBody.setLinvel(
                { x: 0, y: rigidBody.linvel().y, z: 0 },
                true
            );
        }
    });

    return {
        isMoving: !!target.current && !targetReached.current,
        targetReached: targetReached.current,
    };
};

export default usePhysicsWalk;