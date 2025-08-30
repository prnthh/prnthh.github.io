import { Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Ref, useRef } from "react";
import { Vector3, Group, MathUtils, Quaternion } from "three";
import * as THREE from "three";


export const FollowCam = ({
    height,
    cameraOffset = new Vector3(0, -0.3, -3),
    targetOffset = new Vector3(0, 0.3, 3),
    verticalRotation,
    cameraSpeed = 0.1,
    debug = false
}: {
    height: number,
    cameraOffset?: Vector3,
    targetOffset?: Vector3,
    verticalRotation?: React.RefObject<number>
    cameraSpeed?: number
    debug?: boolean
}) => {

    const cameraTarget = useRef<Group>(null);
    const cameraPosition = useRef<Group>(null);
    const cameraWorldPosition = useRef<Vector3>(new Vector3());
    const cameraLookAtWorldPosition = useRef<Vector3>(new Vector3());
    const cameraLookAt = useRef<Vector3>(new Vector3());

    useFrame(({ camera }) => {
        if (cameraPosition.current && cameraTarget.current) {
            cameraPosition.current.position.x = cameraOffset.x;
            cameraPosition.current.position.y = height + cameraOffset.y;
            cameraPosition.current.position.z = cameraOffset.z;

            let pitch = verticalRotation?.current ?? 0;
            pitch = MathUtils.clamp(pitch, -Math.PI / 2, Math.PI / 2);

            // Calculate rotated target offset
            const rotatedTarget = targetOffset.clone();
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
            rotatedTarget.applyQuaternion(q);

            cameraTarget.current.position.x = rotatedTarget.x;
            cameraTarget.current.position.y = rotatedTarget.y;
            cameraTarget.current.position.z = rotatedTarget.z;

            // Get world positions
            cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
            cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);

            // Move camera to position
            camera.position.lerp(cameraWorldPosition.current, cameraSpeed);
            // Always look at the target's world position
            camera.lookAt(cameraLookAtWorldPosition.current);
        }
    });



    return <>
        <group ref={cameraTarget} position-z={1.5} position-y={height * 0.8}>
            {debug && <Box args={[0.1, 0.1, 0.1]}>
                <meshBasicMaterial wireframe color="red" />
            </Box>}
        </group>
        <group ref={cameraPosition} position-y={height * 0.8} position-z={-1}>
            {debug && <Box args={[0.1, 0.1, 0.1]}>
                <meshBasicMaterial wireframe color="blue" />
            </Box>}
        </group>
    </>

}