import { useEffect, useRef } from "react";
import { Object3D } from "three";

const Mouth = ({ headBone, verticalOffset = 0.03, forwardOffset = 0.17, mouthState }: {
    headBone?: string;
    verticalOffset?: number;
    forwardOffset?: number;
    mouthState?: "open" | "closed";
}) => {
    const objectRef = useRef<Object3D | null>(null);

    useEffect(() => {
        // Find parent using objectRef.current.parent
        const parent = objectRef.current?.parent;
        if (parent && objectRef.current) {
            // Default head bone names to search for
            const headBoneNames = headBone ? [headBone] : ["Head", "head", "mixamorig:Head", "mixamorigHead"];

            let bone: Object3D | null = null;

            // Try to find any of the common head bone names
            for (const boneName of headBoneNames) {
                bone = findBoneByName(parent, boneName);
                if (bone) {
                    console.log(`Found head bone: ${boneName}`);
                    break;
                }
            }

            if (bone) {
                // Get the bone's world scale to compensate
                const boneWorldScale = bone.getWorldScale(new Object3D().scale);

                // Attach mesh to bone
                bone.add(objectRef.current);

                // Compensate for bone's scale by inverting it
                objectRef.current.scale.set(
                    1 / boneWorldScale.x,
                    1 / boneWorldScale.y,
                    1 / boneWorldScale.z
                );

                // Adjust position in bone's local space, factoring in scale
                objectRef.current.position.set(0, verticalOffset / boneWorldScale.y, forwardOffset / boneWorldScale.z);
            } else {
                console.warn("Head bone not found, tried:", headBoneNames);
            }
        }
    }, [headBone, forwardOffset, verticalOffset]);

    return (
        <mesh ref={objectRef}>
            <planeGeometry args={[0.1, 0.05]} />
            <meshBasicMaterial color={"pink"} />
        </mesh>
    );
}

function findBoneByName(object: Object3D, name: string): Object3D | null {
    if (object.name === name) return object;
    for (const child of object.children) {
        const found = findBoneByName(child, name);
        if (found) return found;
    }
    return null;
}

export default Mouth;