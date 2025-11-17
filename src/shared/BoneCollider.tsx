import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Object3D, Vector3 } from "three";

/**
 * BoneCollider
 * Shows a debug sphere around the specified bone of a skinned model.
 * @param rootModel THREE.Object3D or Group (the loaded model.scene)
 * @param boneName string (defaults to "LeftFoot")
 * @returns { JSX.Element }
 */
export default function BoneCollider({
    rootModel = undefined,
    boneName,
    parentName = "bob",
}: {
    rootModel?: Object3D,
    boneName?: string,
    parentName?: string
}) {
    const [bone, setBone] = useState<Object3D | null>(null);
    const rbRef = useRef<RapierRigidBody>(null);

    // Find the bone once the model is loaded
    useEffect(() => {
        if (!rootModel || !boneName) { setBone(null); return; }
        let found: Object3D | null = null;
        // Check if rootModel has traverse method
        if (typeof (rootModel as any).traverse === "function") {
            (rootModel as any).traverse((child: Object3D) => {
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

    // Reset rbRef when bone changes to avoid unsafe aliasing
    useEffect(() => {
        rbRef.current = null;
    }, [bone]);

    // Update the sphere's position to match the bone's world position
    useFrame(() => {
        if (bone && rootModel && rbRef.current) {
            try {
                const boneWorldPos = new Vector3();
                bone.getWorldPosition(boneWorldPos);
                // Use world position directly for the collider
                const newPos: [number, number, number] = [
                    boneWorldPos.x,
                    boneWorldPos.y,
                    boneWorldPos.z
                ];
                rbRef.current.setTranslation?.({ x: newPos[0], y: newPos[1], z: newPos[2] }, true);
            } catch (e) {
                // Prevent unreachable error from crashing app
                // Optionally log or handle cleanup here
            }
        }
    });

    return <>
        {rootModel && boneName && bone && <RigidBody name="hand" ref={rbRef}
            sensor colliders="ball" type="fixed"
            onIntersectionEnter={(e) => {
                if (!e.other || e.other.rigidBodyObject?.name == "" || e.other.rigidBodyObject?.name == parentName) return;
                const otherRb = e.other.rigidBody;

                if (otherRb && bone) {
                    // Get positions
                    const boneWorldPos = new Vector3();
                    bone.getWorldPosition(boneWorldPos);
                    const otherPos = otherRb.translation();
                    // Compute direction from collider to other body
                    const dir = new Vector3(
                        otherPos.x - boneWorldPos.x,
                        otherPos.y - boneWorldPos.y,
                        otherPos.z - boneWorldPos.z
                    ).normalize();
                    // Scale impulse
                    const impulseStrength = 10;
                    otherRb.applyImpulse({
                        x: dir.x * impulseStrength,
                        y: dir.y * impulseStrength,
                        z: dir.z * impulseStrength
                    }, true);
                }
            }}>
            <mesh>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshBasicMaterial wireframe color={bone ? 0x00ff00 : 0xff0000} />
            </mesh>
        </RigidBody>}

    </>
}
