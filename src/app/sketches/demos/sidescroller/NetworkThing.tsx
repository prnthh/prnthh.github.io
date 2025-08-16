import { useGLTF } from "@react-three/drei";
import { useEffect, useState } from "react";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";

export default function NetworkThing({
    modelUrl = "/models/environment/slotmachine.glb",
    id,
    onActivate,
    ...props
}: {
    modelUrl?: string;
    id?: string;
    onActivate?: () => void;
    [key: string]: any;
}) {
    const { scene } = useGLTF(modelUrl);
    const [clone, setClone] = useState<THREE.Object3D | null>(null);

    useEffect(() => {
        if (scene) {
            setClone(SkeletonUtils.clone(scene));
        }
    }, [scene]);

    useEffect(() => {
        const remoteHandler = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.id === id) {
                if (onActivate) onActivate();
            }
        };
        window.addEventListener('mp-event', remoteHandler);
        return () => {
            window.removeEventListener('mp-event', remoteHandler);
        };
    }, [id, onActivate]);

    return clone ? (
        <group
            {...props}
            onPointerDown={async (e) => {
                if (onActivate) onActivate();
                window.dispatchEvent(new CustomEvent('mp-trigger', { detail: { id: id, action: 'play' } }));
                e.stopPropagation();
            }}
        >
            <RigidBody type="fixed">
                <primitive object={clone} />
            </RigidBody>
        </group>
    ) : null;
}