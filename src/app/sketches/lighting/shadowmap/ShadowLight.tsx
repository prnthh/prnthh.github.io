import { Box, Helper } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { CameraHelper, DirectionalLight, MeshBasicMaterial } from "three";
import { Vector3 } from "three";


export function ShadowLight({ followCamera = true, debug = false, camOffset = new Vector3(-5, 60, -5) }: { followCamera?: boolean, debug?: boolean, camOffset?: Vector3 }) {
    const directionalLight = useRef<DirectionalLight>(null);
    const offset: [number, number, number] = [2, -6, 2]; // Adjust the target offset as needed
    const lastUpdate = useRef(0);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (t - lastUpdate.current < 0.5) return; // Only update every 1 second
        lastUpdate.current = t;


        if (!directionalLight.current) {
            return;
        }
        const camPosition = followCamera ? new Vector3().copy(state.camera.position) : new Vector3(0, 0, 0);
        camPosition.add(camOffset); // Adjust the offset as needed

        // snap to grid
        camPosition.x = Math.round(camPosition.x);
        camPosition.z = Math.round(camPosition.z);
        camPosition.y = Math.round(camPosition.y);

        directionalLight.current?.position.copy(camPosition);
        camPosition.add(new Vector3(offset[0], offset[1], offset[2])); // Adjust the offset as needed
        directionalLight.current?.target.position.copy(camPosition);
        directionalLight.current?.target.updateMatrixWorld();
    });


    return (
        <>
            <directionalLight
                castShadow
                ref={directionalLight}
                intensity={1.5}
                shadow-normalBias={0.1}
                shadow-mapSize={[1024, 1024]}
            >
                <orthographicCamera
                    attach="shadow-camera"
                    near={0.1}
                    far={100}
                    top={40}
                    bottom={-40}
                    left={-40}
                    right={40}
                >
                    {debug && <Helper type={CameraHelper} />}
                    {debug && <mesh position={[0, 0, 0]} scale={[40, 40, 40]} rotation={[-Math.PI / 2, 0, 0]}>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshBasicMaterial color="red" />
                    </mesh>}
                </orthographicCamera>
            </directionalLight>
        </>
    );
}