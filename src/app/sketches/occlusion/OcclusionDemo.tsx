"use client";
import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { OrbitControls, Sphere, Plane } from "@react-three/drei";
import * as THREE from "three";
import * as THREE_WEBGPU from "three/webgpu";
import * as TSL from "three/tsl";
import { LooseOctree } from "./LooseOctree";

// Extend R3F with WebGPU and TSL classes
extend(THREE_WEBGPU as any);
extend(TSL as any);

declare module '@react-three/fiber' {
    interface ThreeElements extends JSX.IntrinsicElements { }
}

// OcclusionCullingGroup: wraps children, builds loose octree, toggles mesh visibility based on occlusion
function OcclusionCullingGroup({ children }: { children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group>(null);
    const { camera, scene } = useThree();
    const octreeRef = useRef<LooseOctree | null>(null);
    const testMeshRefs = useRef<THREE.Mesh[]>([]);
    const occluderMeshes = useRef<THREE.Mesh[]>([]);

    // On mount or children change, gather meshes and build octree
    useEffect(() => {
        if (!groupRef.current) return;
        const meshes: THREE.Mesh[] = [];
        groupRef.current.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
        });
        // Spheres are test meshes, others are occluders
        const tests: THREE.Mesh[] = [];
        const occluders: THREE.Mesh[] = [];
        meshes.forEach(mesh => {
            if (mesh.geometry.type === "SphereGeometry") {
                tests.push(mesh);
            } else {
                occluders.push(mesh);
            }
        });
        testMeshRefs.current = tests;
        occluderMeshes.current = occluders;
        // Build octree for occluders
        if (occluders.length > 0) {
            const bbox = new THREE.Box3();
            occluders.forEach(mesh => {
                mesh.updateMatrixWorld();
                bbox.expandByObject(mesh);
            });
            const center = bbox.getCenter(new THREE.Vector3());
            const size = bbox.getSize(new THREE.Vector3()).length() * 0.75 || 2;
            const oct = new LooseOctree({ scene, center, size });
            occluders.forEach(mesh => {
                mesh.updateMatrixWorld();
                const item = {
                    geometry: mesh.geometry,
                    material: mesh.material,
                    matrix: mesh.matrixWorld.clone(),
                };
                oct.insert(item);
            });
            octreeRef.current = oct;
        } else {
            octreeRef.current = null;
        }
    }, [children, scene]);

    // Per-frame occlusion test: toggle test mesh visibility
    useFrame(() => {
        if (!octreeRef.current || !testMeshRefs.current.length) return;
        for (const mesh of testMeshRefs.current) {
            if (!mesh) continue;
            // Ray from camera to mesh center
            const origin = camera.position.clone();
            const target = mesh.getWorldPosition(new THREE.Vector3());
            const direction = target.clone().sub(origin).normalize();
            const distance = origin.distanceTo(target);
            const raycaster = new THREE.Raycaster(origin, direction, 0.01, distance - 0.01);
            // Use octree to check for occluder intersections
            const intersects = octreeRef.current.raycast(raycaster, []);
            // If any intersection is not the mesh itself, it's occluded
            let occluded = false;
            for (const inter of intersects) {
                if (inter.object !== mesh) {
                    occluded = true;
                    break;
                }
            }
            mesh.visible = !occluded;
        }
    });

    return <group ref={groupRef}>{children}</group>;
}

const OcclusionDemo = () => {
    return (
        <Canvas
            gl={async (props) => {
                const renderer = new THREE_WEBGPU.WebGPURenderer(props as any);
                await renderer.init();
                return renderer;
            }}
            camera={{ position: [0, 0, 7], fov: 50, near: 0.01, far: 100 }}
        >
            <ambientLight intensity={0.7} />
            <directionalLight position={[0.32, 0.39, 0.7]} intensity={1} />
            <OcclusionCullingGroup>
                <Plane args={[2, 2]} position={[0, 0, 0]}>
                    <meshBasicNodeMaterial transparent opacity={0.5} />
                </Plane>
                {/* Add a grid of spheres along x and z axes */}
                {Array.from({ length: 5 }).map((_, xi) =>
                    Array.from({ length: 5 }).map((_, zi) => {
                        const x = -2 + xi;
                        const z = -4 + zi * 1.5;
                        return (
                            <Sphere key={`sphere-${xi}-${zi}`} args={[0.5, 32, 32]} position={[x, 0, z]}>
                                <meshStandardNodeMaterial color="#00ffff" />
                            </Sphere>
                        );
                    })
                )}
            </OcclusionCullingGroup>
            <OrbitControls minDistance={3} maxDistance={25} />
        </Canvas>
    );
};

export default OcclusionDemo;
