import { Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useRef, useImperativeHandle } from "react";
import { Vector3, Group, MathUtils } from "three";
import { SceneCamera } from "./SceneCamera";

const FollowCam = forwardRef(({
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

            // Get world position for camera
            cameraPosition.current.getWorldPosition(cameraWorldPosition.current);

            // Convert world position to local position relative to parent
            const parent = cameraRef.current.parent;
            if (parent) {
                parent.worldToLocal(cameraWorldPosition.current);
            }

            // Move camera to position
            cameraRef.current.position.lerp(cameraWorldPosition.current, cameraSpeed);

            // Apply pitch rotation directly to camera
            // Camera at negative Z needs to look back toward positive Z (180 degrees)
            cameraRef.current.rotation.x = pitch;
            cameraRef.current.rotation.y = Math.PI;
            cameraRef.current.rotation.z = 0;
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

export default FollowCam;