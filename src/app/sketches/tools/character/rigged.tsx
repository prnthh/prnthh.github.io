import { useGLTF } from "@react-three/drei";
import type { MathProps, ReactProps, EventHandlers, InstanceProps, } from '@react-three/fiber';
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { Object3D, Object3DEventMap, Group } from "three";
import { CCDIKHelper, CCDIKSolver, SkeletonUtils } from "three-stdlib";
import { addBoneAxesHelpers } from "./SkeletonAxesHelper";

type RiggedModelProps = {
    modelUrl: string;
    children?: React.ReactNode;
} & Partial<MathProps<Group<Object3DEventMap>>>;

const RiggedModel: React.FC<RiggedModelProps> = ({ modelUrl, children, ...props }) => {
    const { scene } = useGLTF(modelUrl);
    const [clone, setClone] = useState<Object3D | undefined>(undefined);
    const cloneRef = useRef<Object3D>(null!);

    useEffect(() => {
        if (scene) {
            // Use SkeletonUtils.clone to correctly clone skinned meshes / skeletons
            const cloned = SkeletonUtils.clone(scene as unknown as Object3D);

            // Clone materials and set shadows to avoid sharing GPU resources between instances
            cloned.traverse((child: any) => {
                // console log bones
                if ('isBone' in child && child.isBone) {
                    console.log("Bone:", child.name);
                }
                if (!('isMesh' in child && child.isMesh)) return;
                const mesh = child as any;
                mesh.castShadow = mesh.receiveShadow = true;
                if (mesh.material) mesh.material = (mesh.material as any).clone();
            });

            setClone(cloned);
        }
    }, [scene]);

    // Add bone axes helpers using the functional approach
    useLayoutEffect(() => {
        if (clone) {
            console.log("Adding bone axes helpers to clone");
            return addBoneAxesHelpers(clone, 4.0); // Much larger size
        }
    }, [clone]);

    if (!clone) return null;

    return (
        <>
            <primitive object={clone} ref={cloneRef} {...props}>
                {children}
            </primitive>
        </>
    );
};

export default RiggedModel;
