import { useGLTF } from "@react-three/drei";
import { useEffect, useState } from "react";
import { Object3D } from "three";
import { SkeletonUtils } from "three-stdlib";

const SimpleModel = ({ modelUrl, children }: { modelUrl: string, children?: React.ReactNode }) => {
    const { scene } = useGLTF(modelUrl);
    const [clone, setClone] = useState<Object3D | undefined>(undefined);

    useEffect(() => {
        if (scene) {
            // Use SkeletonUtils.clone to correctly clone skinned meshes / skeletons
            const cloned = SkeletonUtils.clone(scene as unknown as Object3D);

            // Clone materials and set shadows to avoid sharing GPU resources between instances
            cloned.traverse((child: any) => {
                if (!('isMesh' in child && child.isMesh)) return;
                const mesh = child as any;
                mesh.castShadow = mesh.receiveShadow = true;
                if (mesh.material) mesh.material = (mesh.material as any).clone();
            });

            setClone(cloned);
        }
    }, [scene]);

    if (!clone) return null;

    return (
        <group>
            <primitive object={clone}>
                {children}
            </primitive>
        </group>
    );
};

export default SimpleModel;
