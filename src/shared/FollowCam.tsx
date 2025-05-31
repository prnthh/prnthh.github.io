import { Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Ref, useRef } from "react";
import { Vector3, Group } from "three";


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
        if (cameraPosition.current) {
            // Right shoulder position
            cameraPosition.current.position.x = cameraOffset.x;
            cameraPosition.current.position.y = height + cameraOffset.y + Math.sin(verticalRotation?.current ?? 0);
            cameraPosition.current.position.z = cameraOffset.z - Math.cos(verticalRotation?.current ?? 0);

            cameraPosition.current.getWorldPosition(cameraWorldPosition.current);
            camera.position.lerp(cameraWorldPosition.current, cameraSpeed);
        }
        if (cameraTarget.current) {
            cameraTarget.current.position.x = targetOffset.x;
            cameraTarget.current.position.y = targetOffset.y - Math.sin(verticalRotation?.current ?? 0);
            cameraTarget.current.position.z = targetOffset.z + Math.cos(verticalRotation?.current ?? 0);

            cameraTarget.current.getWorldPosition(cameraLookAtWorldPosition.current);
            cameraLookAt.current.lerp(cameraLookAtWorldPosition.current, cameraSpeed);
            camera.lookAt(cameraLookAt.current);
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