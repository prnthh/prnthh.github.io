import { useGLTF, useAnimations, Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, RefObject, useEffect, useRef, useState, useImperativeHandle } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import useAnimationState from "./useAnimationStateBasic";
import useLookAtTarget from "./useLookAtTarget";
import BoneCollider from "./BoneCollider";

const AnimatedModel = forwardRef<THREE.Object3D, {
    model: string;
    basePath?: string,
    animation?: string, height?: number,
    animationOverrides?: { [key: string]: string },
    position?: [number, number, number],
    scale?: number,
    rotation?: [number, number, number],
    modelOffset?: [number, number, number],
    debug?: boolean, onClick?: (e?: any) => void,
    lookTarget?: RefObject<THREE.Object3D | null>
    retargetOptions?: { boneMap?: Record<string, string>, preserveHipPosition?: boolean }
    onActions?: (actions: { [key: string]: THREE.AnimationAction }) => void
}>(
    ({ model, basePath = "/models/human/", animation = "idle", onClick,
        height = 1, animationOverrides, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0],
        modelOffset = [0, 0, 0],
        debug = false, lookTarget, retargetOptions, onActions, ...props
    }, ref) => {
        const modelRef = useRef<THREE.Object3D | undefined>(undefined);
        const { scene, animations } = useGLTF(basePath + model);
        const [clonedScene, setClonedScene] = useState<THREE.Object3D | undefined>(undefined);

        // Create a clone of the scene to avoid modifying the original
        useEffect(() => {
            if (scene) {
                const cloned = SkeletonUtils.clone(scene);
                cloned.traverse((child: THREE.Object3D) => {
                    if ('isMesh' in child) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                setClonedScene(cloned);
            }
        }, [scene]);

        useLookAtTarget(clonedScene, lookTarget, 'mixamorigNeck')

        const { mixer, setThisAnimation, actions } = useAnimationState(clonedScene, basePath, animationOverrides, onActions);

        useEffect(() => {
            if (animation && mixer) {
                setThisAnimation(animation);
            }
        }, [animation, mixer, setThisAnimation]);

        // // Update the mixer on each frame
        useFrame((state, delta) => {
            if (mixer) mixer.update(delta);
        });

        useImperativeHandle(ref, () => modelRef.current as THREE.Object3D, [modelRef]);

        return (
            <group {...props} position={position} onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(e);
            }}>
                {debug && <Box args={[0.3, scale, 0.3]} position={[0, 1 / 2 * scale, 0]}>
                    <meshBasicMaterial wireframe color="red" />
                </Box>}
                <group position={modelOffset}>
                    {clonedScene && <primitive scale={scale / height} rotation={rotation} object={clonedScene} ref={modelRef} />}
                    {clonedScene && <BoneCollider rootModel={clonedScene} boneName="RightHand" />}
                </group>
            </group>
        );
    }
);

// Preload common models here
// useGLTF.preload('/rigga.glb');

export default AnimatedModel;