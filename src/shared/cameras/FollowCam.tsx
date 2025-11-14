import { Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useRef, useImperativeHandle } from "react";
import { Vector3, Group, MathUtils } from "three";
import * as THREE from "three";
import { SceneCamera } from "./SceneCamera";

export const FollowCam = forwardRef(({
    height,
    cameraOffset = [0, -0.3, -3],
    targetOffset = [0, 0.3, 3],
    verticalRotation,
    cameraSpeed = 0.1,
    debug = false,
    fov = 75,
}: {
    height: number,
    cameraOffset?: [number, number, number],
    targetOffset?: [number, number, number],
    verticalRotation?: React.RefObject<number>
    cameraSpeed?: number
    debug?: boolean
    fov?: number
}, ref) => {

    const sceneCameraRef = useRef<any>(null);
    const cameraTarget = useRef<Group>(null);
    const cameraPosition = useRef<Group>(null);
    const cameraWorldPosition = useRef<Vector3>(new Vector3());
    const cameraLookAtWorldPosition = useRef<Vector3>(new Vector3());

    // Forward the ref to expose the camera
    useImperativeHandle(ref, () => sceneCameraRef.current);

    useFrame(() => {
        const cameraRef = sceneCameraRef.current?.cameraRef;
        if (cameraRef?.current && cameraPosition.current && cameraTarget.current) {
            cameraPosition.current.position.x = cameraOffset[0];
            cameraPosition.current.position.y = height + cameraOffset[1];
            cameraPosition.current.position.z = cameraOffset[2];

            let pitch = verticalRotation?.current ?? 0;
            pitch = MathUtils.clamp(pitch, -Math.PI / 2, Math.PI / 2);

            // Calculate rotated target offset
            const rotatedTarget = new THREE.Vector3(...targetOffset);
            const q = new THREE.Quaternion();
            q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch);
            rotatedTarget.applyQuaternion(q);

            cameraTarget.current.position.set(rotatedTarget.x, rotatedTarget.y, rotatedTarget.z);

            // Get world positions
            cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
            cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);

            // Convert world position to local position relative to parent
            const parent = cameraRef.current.parent;
            if (parent) {
                parent.worldToLocal(cameraWorldPosition.current);
            }

            // Move camera to position and look at target
            cameraRef.current.position.lerp(cameraWorldPosition.current, cameraSpeed);
            cameraRef.current.lookAt(cameraLookAtWorldPosition.current);
        }
    }, -50); // Camera updates after player movement (-100) for smooth following

    return <SceneCamera ref={sceneCameraRef} fov={fov}>
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
    </SceneCamera>

});