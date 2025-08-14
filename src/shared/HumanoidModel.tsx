import { useGLTF, useAnimations, Box } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { forwardRef, RefObject, useEffect, useRef, useState, useImperativeHandle } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import useAnimationState from "./useAnimationStateBasic";
import useLookAtTarget from "./useLookAtTarget";
import BoneCollider from "./BoneCollider";

const AnimatedModel = forwardRef<THREE.Object3D, {
    name?: string,
    model: string;
    basePath?: string,
    animation?: string | string[], // <-- allow string or array
    height?: number,
    animationOverrides?: { [key: string]: string },
    position?: [number, number, number],
    scale?: number,
    rotation?: [number, number, number],
    modelOffset?: [number, number, number],
    debug?: boolean, onClick?: (e?: any) => void,
    lookTarget?: RefObject<THREE.Object3D | null>
    retargetOptions?: { boneMap?: Record<string, string>, preserveHipPosition?: boolean }
    onActions?: (actions: { [key: string]: THREE.AnimationAction }) => void
    attachments?: { [key: string]: { model: string, attachpoint: string, offset: THREE.Vector3, scale: THREE.Vector3, rotation: THREE.Vector3 } },
    children?: React.ReactNode;
}>(
    ({ name, model, basePath = "/models/human/", animation = "idle", onClick,
        height = 1, animationOverrides, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0],
        modelOffset = [0, 0, 0],
        debug = false, lookTarget, retargetOptions, onActions, attachments, children, ...props
    }, ref) => {
        const modelRef = useRef<THREE.Object3D | undefined>(undefined);
        const { scene, animations } = useGLTF(basePath + model);
        const [clonedScene, setClonedScene] = useState<THREE.Object3D | undefined>(undefined);

        // Create a clone of the scene to avoid modifying the original
        useEffect(() => {
            if (scene) {
                const cloned = SkeletonUtils.clone(scene as unknown as THREE.Object3D);
                cloned.traverse((child) => {
                    if ('isMesh' in child) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                setClonedScene(cloned);
            }
        }, [scene]);

        useLookAtTarget(clonedScene, lookTarget, 'mixamorigNeck')

        // Handle attachments using useEffect instead of hook calls in loops
        useEffect(() => {
            if (!attachments || !clonedScene) return;

            const cleanupFunctions: (() => void)[] = [];

            // Process attachments without using hooks in loops
            Object.entries(attachments).forEach(([key, attachment]) => {
                const bone = clonedScene.getObjectByName(attachment.attachpoint);
                if (bone && attachment.model) {
                    const loader = new GLTFLoader();

                    loader.load(
                        attachment.model,
                        (gltf) => {
                            // Remove any existing attachment with the same key
                            const existingAttachment = bone.children.find(
                                child => child.name === `attachment-${attachment.attachpoint}-${key}`
                            );
                            if (existingAttachment) {
                                bone.remove(existingAttachment);
                            }

                            const attachedModel = SkeletonUtils.clone(gltf.scene);
                            attachedModel.name = `attachment-${attachment.attachpoint}-${key}`;
                            attachedModel.position.copy(attachment.offset);
                            attachedModel.scale.copy(attachment.scale);
                            attachedModel.rotation.set(attachment.rotation.x, attachment.rotation.y, attachment.rotation.z);
                            bone.add(attachedModel);
                        },
                        undefined,
                        (error) => {
                            console.error('Error loading attachment model:', attachment.model, error);
                        }
                    );

                    // Store cleanup function
                    cleanupFunctions.push(() => {
                        const attachmentToRemove = bone.children.find(
                            child => child.name === `attachment-${attachment.attachpoint}-${key}`
                        );
                        if (attachmentToRemove) {
                            bone.remove(attachmentToRemove);
                        }
                    });
                }
            });

            // Cleanup function
            return () => {
                cleanupFunctions.forEach(cleanup => cleanup());
            };
        }, [attachments, clonedScene]);
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
            <group
                {...props}
                position={position}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    if (onClick) onClick(e);
                }}
                onContextMenu={(e) => {
                    if (e.nativeEvent && typeof e.nativeEvent.preventDefault === 'function') {
                        e.nativeEvent.preventDefault();
                    }
                }}
            >
                {debug && <Box args={[0.3, scale, 0.3]} position={[0, 1 / 2 * scale, 0]}>
                    <meshBasicMaterial wireframe color="red" />
                </Box>}
                <mesh position={[0, height / 2, 0]} material={new THREE.MeshBasicMaterial({ opacity: 0, transparent: true })}>
                    <boxGeometry args={[0.6, 2, 0.6]} />
                </mesh>
                <group position={modelOffset}>
                    {clonedScene && <primitive name={name} scale={scale / height} rotation={rotation} object={clonedScene} ref={modelRef} />}
                    {clonedScene && <BoneCollider parentName={name} rootModel={clonedScene}
                        boneName={animation == 'rpunch' ? "RightHand" :
                            animation == 'lpunch' ? "LeftHand" :
                                undefined}
                    />}
                    {children}
                </group>
            </group>
        );
    }
);

// Preload common models here
// useGLTF.preload('/rigga.glb');

export default AnimatedModel;