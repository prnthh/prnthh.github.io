import React, { forwardRef } from "react";
import { useGLTF } from "@react-three/drei";

// Mesh component type and registration
export interface MeshData {
    path: string;
}

export function addMeshComponent(gameObject: any, data: Partial<MeshData> = {}) {
    const meshData: MeshData = {
        path: data.path || '/models/rigga.glb',
    };
    return {
        ...gameObject,
        components: {
            ...gameObject.components,
            mesh: meshData,
        },
    };
}

// Generic mesh renderer
export const MeshComponent = forwardRef(({ meshComponent }: { meshComponent?: MeshData }, ref) => {
    if (meshComponent && meshComponent.path) {
        return <GLTFMesh path={meshComponent.path} refProp={ref} />;
    }
    // Fallback: box mesh
    return (
        <mesh ref={ref}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
        </mesh>
    );
});

export function GLTFMesh({ path, refProp }: { path: string; refProp: any }) {
    const gltf = useGLTF(path);
    const scene = (gltf && "scene" in gltf) ? gltf.scene : null;
    return scene ? <primitive ref={refProp} object={scene} /> : null;
}
