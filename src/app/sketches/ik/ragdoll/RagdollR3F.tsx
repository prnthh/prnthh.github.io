import { useRapier } from "@react-three/rapier";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Ragdoll } from "./ragdoll";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";

export function RagdollR3F({ modelPath = '/models/human/onimilio/rigged.glb' }) {
    const { world } = useRapier();
    const { scene } = useThree();
    const ragdoll = useRef<Ragdoll | null>(null);
    const gltf = useGLTF(modelPath);
    useEffect(() => {
        if (world && scene && gltf) {
            const clonedGltf = SkeletonUtils.clone(gltf.scene)
            ragdoll.current = new Ragdoll(world, scene, clonedGltf);
        }
        // Cleanup to ensure only one ragdoll exists
        return () => {
            if (ragdoll.current && ragdoll.current.mesh) {
                scene.remove(ragdoll.current.mesh);
                ragdoll.current = null;
            }
        };
    }, [world, scene, gltf]);

    useFrame((_, delta) => {
        if (ragdoll.current) {
            ragdoll.current.update(delta);
        }
    });

    return null;
}