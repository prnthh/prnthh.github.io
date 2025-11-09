import { RigidBody } from "@react-three/rapier";
import { useTexture } from "@react-three/drei";
import * as THREE from 'three';
import { Suspense, useEffect, useRef } from 'react';

export type GroundPropsType = {
    position?: [number, number, number];
    image?: string;
};


export default function Ground({ position = [0, 0, 0], image }: GroundPropsType) {
    return (
        <RigidBody type="fixed" colliders='trimesh' position={position} >
            <Suspense fallback={<>
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                </mesh>
            </>}>
                <ImageGround image={image} />
            </Suspense>
        </RigidBody>
    );
};

const ImageGround = ({
    image = "/textures/road.jpg"
}) => {
    const textures = useTexture({
        map: image,
        // roughnessMap: "/textures/grass_roughness.jpg"
    });

    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    // Set texture to repeat/tile
    useEffect(() => {
        if (textures.map) {
            textures.map.wrapS = textures.map.wrapT = THREE.RepeatWrapping;

            // Set repeat to a much higher value to avoid stretching
            textures.map.repeat.set(10, 10); // Increase tiling frequency

            // Improve texture quality when viewed at an angle
            textures.map.anisotropy = 16;

            // Optional: Adjust texture filtering for better appearance
            textures.map.minFilter = THREE.LinearMipmapLinearFilter;
            textures.map.magFilter = THREE.LinearFilter;

            // Update texture to apply changes
            textures.map.needsUpdate = true;
        }
    }, [textures.map]);


    return <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial ref={materialRef} {...textures} />
        {/* <gridHelper args={[100, 100, 'white', 'lightblue']} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} /> */}
    </mesh>;
}