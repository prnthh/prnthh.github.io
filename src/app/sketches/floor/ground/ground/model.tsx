import { RigidBody } from "@react-three/rapier";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from 'three';
import { Suspense, useEffect, useRef } from 'react';


export default function MapModel({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
    return (
        <RigidBody type="fixed" colliders='trimesh' position={position} >
            <Model />
        </RigidBody>
    );
};

const Model = () => {
    const { scene } = useGLTF('/models/maps/galactic_arena.glb');
    const ref = useRef<THREE.Group>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }
    }, [scene]);

    return (
        <primitive
            object={scene}
            ref={ref}
            receiveShadow
            castShadow
        // Optionally, you can set position/rotation/scale here
        />
    );
}