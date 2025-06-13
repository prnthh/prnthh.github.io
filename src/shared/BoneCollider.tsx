import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * BoneCollider
 * Shows a debug sphere around the specified bone of a skinned model.
 * @param rootModel THREE.Object3D or Group (the loaded model.scene)
 * @param boneName string (defaults to "LeftFoot")
 * @returns { JSX.Element }
 */
export default function BoneCollider({
    rootModel = undefined,
    boneName = "LeftFoot"
}: {
    rootModel?: THREE.Object3D,
    boneName: string
}) {
    const [bone, setBone] = useState<THREE.Object3D | null>(null);
    const sphereRef = useRef<THREE.Mesh>(null);
    const [spherePosition, setSpherePosition] = useState<[number, number, number]>([0, 0, 0]);

    // Find the bone once the model is loaded
    useEffect(() => {
        if (!rootModel) return;
        let found: THREE.Object3D | null = null;
        // Check if rootModel has traverse method
        if (typeof (rootModel as any).traverse === "function") {
            (rootModel as any).traverse((child: THREE.Object3D) => {
                console.log("Checking child:", child.name);
                if (child.name.includes(boneName)) {
                    found = child;
                }
            });
        } else {
            // Fallback: check rootModel itself
            if (rootModel.name === boneName) {
                found = rootModel;
            }
        }
        setBone(found);
    }, [rootModel, boneName]);

    // Update the sphere's position to match the bone's world position
    useFrame(() => {
        if (bone && rootModel) {
            const boneWorldPos = new THREE.Vector3();
            bone.getWorldPosition(boneWorldPos);
            // Convert world position to rootModel's local space
            const localPos = rootModel.worldToLocal(boneWorldPos.clone());
            // Apply rootModel's scale to the local position
            const scale = rootModel.scale;
            setSpherePosition([
                localPos.x * scale.x,
                localPos.y * scale.y,
                localPos.z * scale.z
            ]);
        }
    });

    return <mesh ref={sphereRef} position={spherePosition}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial wireframe color={bone ? 0x00ff00 : 0xff0000} />
    </mesh>
}
