import { Helper } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { CameraHelper, DirectionalLight } from "three";
import { Vector3 } from "three";

export function ShadowLight({ followCamera = true, debug = false }: { followCamera?: boolean, debug?: boolean }) {
    const directionalLight = useRef<DirectionalLight>(null);
    const offset: [number, number, number] = [2, -6, 2]; // Adjust the target offset as needed
    const lastUpdate = useRef(0);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (t - lastUpdate.current < 1) return; // Only update every 1 second
        lastUpdate.current = t;

        const radius = 10;
        const y = 10; // fixed height
        const x = Math.cos(t) * radius;
        const z = Math.sin(t) * radius;

        if (!directionalLight.current || !followCamera) {
            // If not following camera, use circular path
            const camPosition = new Vector3(x, y, z);
            directionalLight.current?.position.copy(camPosition);
            // Target the center of the scene
            directionalLight.current?.target.position.set(0, 0, 0);
            directionalLight.current?.target.updateMatrixWorld();
            return;
        }
        const camPosition = new Vector3().copy(state.camera.position);
        camPosition.add(new Vector3(0, 5, 0)); // Adjust the offset as needed

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
                shadow-normalBias={0.05}
                shadow-mapSize={[1024, 1024]}
            >
                <orthographicCamera
                    attach="shadow-camera"
                    near={0.1}
                    far={20}
                    top={10}
                    bottom={-10}
                    left={-10}
                    right={10}
                >
                    {debug && <Helper type={CameraHelper} />}
                </orthographicCamera>
            </directionalLight>
        </>
    );
}