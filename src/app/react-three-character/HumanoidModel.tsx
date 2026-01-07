import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from "react";
import { Group, Mesh, Object3D, } from "three";
import { SimplifyModifier, SkeletonUtils } from "three-stdlib";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

import useAnimationState from "../react-three-controller/ped/useAnimationStateBasic";
import useLookAtTarget from "../react-three-controller/ped/useLookAtTarget";
import { AnimatedModelProps, AnimatedModelRef } from "../react-three-controller/ped/types";
// import { MeshToonNodeMaterial } from "three/webgpu";

// steps to go from AI generated model to animated model:
// 1. Generate .glb model from AI tool (eg. https://www.meshy.ai/)
// 2. Convert to .glb to .fbx with https://imagetostl.com/convert/file/glb/to/fbx
// 3. Import .fbx model into Mixamo and rig, export rigged skin without animations as .fbx
// 4. Export animations from mixamo as separate .fbx files (idle.fbx, walk.fbx, etc.) without skin
// 5. Convert mixamo rigged .fbx (3) to .glb using Blender to preserve bones, fix rotations etc.
// 6. This module loads the rigged .glb (5) and applies Mixamo animation .fbx (4) as needed

const AnimatedModel = forwardRef<AnimatedModelRef, AnimatedModelProps>(
    ({ name, model, basePath = "/models/human/", animation = "idle", onClick,
        height = 1, animationOverrides, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0],
        modelOffset = [0, 0, 0],
        debug = false, lookTarget, retargetOptions, onActions, attachments, enableBoneCollider = true, children, ...props
    }, ref) => {
        const modelRef = useRef<Object3D | undefined>(undefined);
        const groupRef = useRef<Group>(null!);
        const { scene, animations } = useGLTF(basePath + model);
        const [clonedScene, setClonedScene] = useState<Object3D | undefined>(undefined);

        // Create a clone of the scene to avoid modifying the original
        useEffect(() => {
            if (scene) {
                const cloned = SkeletonUtils.clone(scene as unknown as Object3D);
                const modifier = new SimplifyModifier();
                cloned.traverse((child) => {
                    if (!('isMesh' in child && child.isMesh)) return;
                    const mesh = child as Mesh;
                    mesh.castShadow = mesh.receiveShadow = true;

                    // TOON SHADING
                    // if (mesh.material) mesh.material = (mesh.material as any).clone();
                    // const mat = new MeshToonNodeMaterial({
                    //     map: (mesh.material as any).map || null,
                    //     color: (mesh.material as any).color || new THREE.Color(0xffffff),
                    // })
                    // mesh.material = mat;

                    // if (mat && 'flatShading' in mat) { mat.flatShading = true; mat.needsUpdate = true; }

                    // const geom = mesh.geometry as THREE.BufferGeometry | undefined;
                    // if (!geom || !geom.attributes || !geom.attributes.position) return;

                    // // Skip skinned/morph/indexed geometries and mark for debugging
                    // const hasSkin = !!(geom.attributes['skinIndex'] || geom.attributes['skinWeight']);
                    // const hasMorph = !!(geom.morphAttributes && Object.keys(geom.morphAttributes).length > 0);
                    // if (hasSkin || hasMorph) { mesh.userData = { ...(mesh as any).userData, simplifySkipped: true }; return; }
                    // if (geom.index) { mesh.userData = { ...(mesh as any).userData, simplifySkippedIndexed: true }; return; }

                    // const target = Math.max(4, Math.floor(geom.attributes?.position.count * 0.875));
                    // const trySimplify = (g: THREE.BufferGeometry) => {
                    //     try { return modifier.modify(g, target) as THREE.BufferGeometry; } catch { return null; }
                    // };

                    // const simplified = trySimplify(geom) ?? (() => {
                    //     try {
                    //         const nonIndexed = (geom as any).toNonIndexed ? (geom as any).toNonIndexed() as THREE.BufferGeometry : geom.clone() as THREE.BufferGeometry;
                    //         const s = trySimplify(nonIndexed);
                    //         try { nonIndexed.dispose(); } catch { }
                    //         return s;
                    //     } catch { return null; }
                    // })();

                    // if (!simplified) { mesh.userData = { ...(mesh as any).userData, simplifyError: true }; return; }
                    // try { geom.dispose(); } catch { }
                    // mesh.geometry = simplified;
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

        useImperativeHandle(ref, () => {
            const group = groupRef.current;
            return Object.assign(group, {
                setAnimation: setThisAnimation,
                groupRef,
                modelRef
            });
        }, [setThisAnimation]);

        return (
            <group
                ref={groupRef}
                position={position}
                {...props}
            >
                {clonedScene && <primitive position={modelOffset} name={name} scale={scale / height} rotation={rotation} object={clonedScene} ref={modelRef} />}

                {/* raycast mesh instead of skinned mesh for better interaction */}
                <mesh position={[0, height / 2, 0]} onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(e);
                }}>
                    <capsuleGeometry args={[0.2, height]} />
                    <meshBasicMaterial visible={false} />
                </mesh>

                {children}
            </group>
        );
    }
);

// Syntax to preload a model synchronously
// useGLTF.preload('/rigga.glb');

AnimatedModel.displayName = "AnimatedModel";

export default AnimatedModel;