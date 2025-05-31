import { Helper } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { CameraHelper, DirectionalLight } from "three";

export function ShadowLight() {

    const directionalLight = useRef<DirectionalLight>(null);

    useFrame(() => {
        // const player = globalentitystorestate.entities[globalentitystorestate.playerId].rb.current

        directionalLight.current?.position.set(10, 10, 10);
        // directionalLight.current?.target.position.set(player.position.x, player.position.y, player.position.z)
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
                    far={30}
                    top={20}
                    bottom={-20}
                    left={-20}
                    right={20}
                >
                    <Helper type={CameraHelper} />
                </orthographicCamera>
            </directionalLight>
        </>
    );
}