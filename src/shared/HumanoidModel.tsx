import { useGLTF, useAnimations, Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import useAnimationState from "./useAnimationStateBasic";

const AnimatedModel = ({ model, animation = "idle", onClick, height = 1, animationOverrides, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], debug = false, retargetOptions, ...props }: {
    model: string; animation?: string, height?: number,
    animationOverrides?: { [key: string]: string },
    position?: [number, number, number],
    scale?: number,
    rotation?: [number, number, number],
    debug?: boolean, onClick?: (e?: any) => void,
    retargetOptions?: { boneMap?: Record<string, string>, preserveHipPosition?: boolean }
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(model);
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

    const { mixer, setThisAnimation } = useAnimationState(clonedScene, animationOverrides);

    useEffect(() => {
        if (animation && mixer) {
            setThisAnimation(animation);
        }
    }, [animation, mixer, setThisAnimation]);

    // // Update the mixer on each frame
    useFrame((state, delta) => {
        if (mixer) mixer.update(delta);
    });

    return (
        <group ref={groupRef} {...props} position={position} onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(e);
        }}>
            {debug && <Box args={[0.3, scale, 0.3]} position={[0, 1 / 2 * scale, 0]}>
                <meshBasicMaterial wireframe color="red" />
            </Box>}
            {clonedScene && <primitive scale={scale / height} rotation={rotation} object={clonedScene} />}
        </group>
    );
}

// Preload common models here
useGLTF.preload('/rigga.glb');

export default AnimatedModel;