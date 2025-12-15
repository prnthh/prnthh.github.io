import { useFrame, useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { Object3D, Quaternion, Scene } from "three";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { Ragdoll } from "@/shared/physics/Ragdoll";

export type PedRagdollProps = {
    /** World position to spawn the ragdoll at. */
    position: [number, number, number];
    /** World rotation (quaternion) to spawn the ragdoll at. */
    rotation?: [number, number, number, number];
    /** GLB path. Should generally match the Ped's model. */
    modelPath: string;
    /** Optional initial impulse applied to the torso (e.g. bullet direction). */
    impulse?: [number, number, number];
};

export default function PedRagdoll({ position, rotation, modelPath, impulse }: PedRagdollProps) {
    const { world } = useRapier();
    const { scene } = useThree();
    const ragdollRef = useRef<Ragdoll | null>(null);

    const gltf = useGLTF(modelPath);

    const spawnQuat = useMemo(() => {
        if (!rotation) return undefined;
        return new Quaternion(rotation[0], rotation[1], rotation[2], rotation[3]);
    }, [rotation]);

    useEffect(() => {
        if (!world || !scene || !gltf) return;

        let cancelled = false;
        let raf = 0;

        // Defer rigidbody creation to the next frame.
        // In React 18 StrictMode, effects can be double-invoked and Rapier can throw
        // "recursive use of an object" if creation happens during certain phases.
        raf = requestAnimationFrame(() => {
            if (cancelled) return;

            const cloned = SkeletonUtils.clone(gltf.scene) as Object3D;
            ragdollRef.current = new Ragdoll(world, scene as Scene, cloned, position, {
                worldQuaternion: spawnQuat,
            });

            if (impulse && ragdollRef.current?.torso) {
                ragdollRef.current.torso.applyImpulse({ x: impulse[0], y: impulse[1], z: impulse[2] }, true);
            }
        });

        return () => {
            cancelled = true;
            if (raf) cancelAnimationFrame(raf);
            ragdollRef.current?.dispose();
            ragdollRef.current = null;
        };
    }, [world, scene, gltf, position[0], position[1], position[2], spawnQuat, impulse?.[0], impulse?.[1], impulse?.[2]]);

    useFrame((_, delta) => {
        ragdollRef.current?.update(delta);
    });

    return null;
}
