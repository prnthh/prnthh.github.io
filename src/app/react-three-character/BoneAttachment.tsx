import { createPortal } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { Group, Object3D } from "three";

function findObjectByName(object: Object3D, names: string[]): Object3D | null {
    if (names.includes(object.name)) return object;
    for (const child of object.children) {
        const found = findObjectByName(child, names);
        if (found) return found;
    }
    return null;
}

type BoneAttachmentProps = {
    attachpoint: string | string[];
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    children?: React.ReactNode;
};

export default function BoneAttachment({
    attachpoint,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    children,
}: BoneAttachmentProps) {
    const [anchor, setAnchor] = useState<Group | null>(null);
    const [bone, setBone] = useState<Object3D | null>(null);
    const attachpoints = Array.isArray(attachpoint) ? attachpoint : [attachpoint];
    const attachment = (
        <group position={position} rotation={rotation} scale={scale}>
            {children}
        </group>
    );

    useEffect(() => {
        const parent = anchor?.parent;
        const nextBone = parent ? findObjectByName(parent, attachpoints) : null;
        setBone((currentBone) => currentBone === nextBone ? currentBone : nextBone);
    }, [anchor, attachpoints]);

    return (
        <>
            <group ref={setAnchor}>
                {!bone && (
                    <group visible={false}>
                        {attachment}
                    </group>
                )}
            </group>
            {bone && createPortal(attachment, bone)}
        </>
    );
}