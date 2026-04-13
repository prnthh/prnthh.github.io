import { createPortal } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Group, Object3D } from "three";

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
    const anchorRef = useRef<Group>(null);
    const [bone, setBone] = useState<Object3D | null>(null);

    useEffect(() => {
        const parent = anchorRef.current?.parent;
        if (!parent) {
            setBone(null);
            return;
        }

        const attachpoints = Array.isArray(attachpoint) ? attachpoint : [attachpoint];
        setBone(findObjectByName(parent, attachpoints));
    }, [attachpoint]);

    return (
        <>
            <group ref={anchorRef} visible={false} />
            {bone && createPortal(
                <group position={position} rotation={rotation} scale={scale}>
                    {children}
                </group>,
                bone
            )}
        </>
    );
}