import { RigidBody } from "@react-three/rapier";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from 'three';
import { Suspense, useEffect, useRef } from 'react';


export default function MapModel({ position = [0, 0, 0], scale = 1, modelUrl = '/models/maps/galactic_arena.glb' }: { position?: [number, number, number], scale?: number, modelUrl?: string }) {
    return (
        <RigidBody type="fixed" colliders='trimesh' position={position}>
            <Model modelUrl={modelUrl} scale={scale} />
        </RigidBody>
    );
};

const Model = ({ modelUrl, scale }: { modelUrl: string, scale: number }) => {
    const { scene } = useGLTF(modelUrl);
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
            scale={scale}
            receiveShadow
            castShadow
        // Optionally, you can set position/rotation/scale here
        />
    );
}