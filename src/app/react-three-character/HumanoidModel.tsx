import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Group } from "three";
import type { Mesh, Object3D } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { LAYER_DEFAULT, LAYER_SHADOW_ONLY } from "@/shared/util/layers";

import useAnimationState from "./useAnimationStateBasic";
import useLookAtTarget from "./useLookAtTarget";
import type { AnimatedModelProps, AnimatedModelRef } from "./types";
// import { MeshToonNodeMaterial } from "three/webgpu";

// steps to go from AI generated model to animated model:
// 1. Generate .glb model from AI tool (eg. https://www.meshy.ai/)
// 2. Convert to .glb to .fbx with https://imagetostl.com/convert/file/glb/to/fbx
// 3. Import .fbx model into Mixamo and rig, export rigged skin without animations as .fbx
// 4. Export animations from mixamo as separate .fbx files (idle.fbx, walk.fbx, etc.) without skin
// 5. Convert mixamo rigged .fbx (3) to .glb using Blender to preserve bones, fix rotations etc.
// 6. This module loads the rigged .glb (5) and applies Mixamo animation .fbx (4) as needed

const DEFAULT_HUMANOID_BASE_PATH = "/models/human/onimilio/";

function resolveAssetPath(path: string | undefined, basePath = DEFAULT_HUMANOID_BASE_PATH) {
    const value = path?.trim();
    if (!value) return undefined;
    if (value.startsWith("/") || value.startsWith("data:") || value.startsWith("blob:") || /^[a-z]+:\/\//i.test(value)) return value;

    const normalizedBasePath = basePath.trim().replace(/\/?$/, "/");
    return `${normalizedBasePath}${value.replace(/^\/+/, "")}`;
}

function getResolvedModelPath(model: string | undefined, basePath: string) {
    return resolveAssetPath(model ?? "rigged.glb", basePath) ?? `${basePath.replace(/\/?$/, "/")}rigged.glb`;
}

function resolveAnimationOverrides(animationOverrides: AnimatedModelProps["animationOverrides"], basePath: string) {
    if (!animationOverrides) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries(animationOverrides).map(([key, value]) => [key, resolveAssetPath(value, basePath) ?? value])
    );
}

const AnimatedModel = forwardRef<AnimatedModelRef, AnimatedModelProps>(
    ({ name, model, animation = "idle", onClick,
        basePath = DEFAULT_HUMANOID_BASE_PATH,
        height = 1, animationOverrides, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0],
        modelOffset = [0, 0, 0],
        debug = false, lookTarget, retargetOptions, onActions, attachments, shadowOnly = false, children, ...props
    }, ref) => {
        const modelRef = useRef<Object3D | null>(null);
        const groupRef = useRef<Group | null>(null);
        const resolvedModelPath = useMemo(() => getResolvedModelPath(model, basePath), [basePath, model]);
        const resolvedAnimationOverrides = useMemo(() => resolveAnimationOverrides(animationOverrides, basePath), [animationOverrides, basePath]);
        const { scene, animations } = useGLTF(resolvedModelPath);
        const [clonedScene, setClonedScene] = useState<Object3D | undefined>(undefined);

        // Create a clone of the scene to avoid modifying the original
        useEffect(() => {
            if (scene) {
                const cloned = SkeletonUtils.clone(scene as unknown as Object3D);
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

        // In shadow-only mode, move meshes to LAYER_SHADOW_ONLY so the player
        // camera (layer 0 only) cannot see them, but shadow cameras (which have
        // LAYER_SHADOW_ONLY enabled) will still render them in the shadow map.
        useEffect(() => {
            if (!clonedScene) return;
            const layer = shadowOnly ? LAYER_SHADOW_ONLY : LAYER_DEFAULT;
            clonedScene.traverse((child) => {
                if (!('isMesh' in child && child.isMesh)) return;
                const mesh = child as Mesh;
                mesh.castShadow = true;
                mesh.layers.set(layer);
            });
        }, [clonedScene, shadowOnly]);

        useLookAtTarget(clonedScene, lookTarget, 'mixamorigNeck')


        const { mixer, setThisAnimation } = useAnimationState(clonedScene, resolvedAnimationOverrides, onActions, animations);

        useEffect(() => {
            if (animation && mixer) {
                setThisAnimation(animation);
            }
        }, [animation, mixer, setThisAnimation]);

        // // Update the mixer on each frame
        useFrame((_, delta) => {
            if (mixer) mixer.update(delta);
        });

        useImperativeHandle(ref, () => {
            const group = groupRef.current ?? new Group();
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
                {clonedScene && <primitive position={modelOffset} name={name} scale={scale} rotation={rotation} object={clonedScene} ref={modelRef} />}

                {/* raycast mesh instead of skinned mesh for better interaction */}
                <mesh position={[0, height / 2, 0]} onPointerDown={(e) => {
                    e.stopPropagation();
                    onClick?.(e as unknown as import("@react-three/fiber").ThreeEvent<MouseEvent>);
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