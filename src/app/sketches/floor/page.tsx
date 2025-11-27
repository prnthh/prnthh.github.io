"use client";

import { useMemo, useRef } from "react";
import { InstancedMesh, PlaneGeometry } from "three";
import { OrbitControls, PerspectiveCamera, Plane } from "@react-three/drei";
import { InstancedRigidBodies, Physics, RigidBody } from "@react-three/rapier";
import GameCanvas from "@/shared/GameCanvas";

// toys
import Playground from "@/shared/debug/Playground";

// heightfield terrain
import ColliderTerrain from "@/shared/ground/ColliderTerrain";
import ShadedGround from "@/shared/ground/ShadedGround";

// floor materials
import { TextureSplatMaterial } from "@/shared/shaders/floor/TextureSplatMaterial";
import { ShinyFloor } from "@/shared/shaders/floor/ShinyFloorMaterial";
import { WaterMaterial } from "@/shared/shaders/Water";
import DetailedMaterial from "@/shared/shaders/floor/TexturedMaterial";
const detailedMaterials = {
    "dirt": {
        map: '/textures/floor/terrain/dirt-512.jpg'
    },
    "sand": {
        map: '/textures/floor/terrain/sand-512.jpg'
    },
    "rocks": {
        map: '/textures/floor/rocks/gray_rocks_diff_1k.jpg',
        displacementMap: '/textures/floor/rocks/gray_rocks_disp_1k.png',
        normalMap: '/textures/floor/rocks/gray_rocks_nor_gl_1k.jpg',
        roughnessMap: '/textures/floor/rocks/gray_rocks_rough_1k.jpg',
    },
    "rocks2": {
        map: '/textures/floor/rocks2/aerial_rocks_04_diff_1k.jpg',
        displacementMap: '/textures/floor/rocks2/aerial_rocks_04_disp_1k.png',
        normalMap: '/textures/floor/rocks2/aerial_rocks_04_nor_gl_1k.jpg',
        roughnessMap: '/textures/floor/rocks2/aerial_rocks_04_rough_1k.jpg',
    }
}

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>

                        <ShadedGround position={[0, 0, -160]} />

                        <RigidBody type="fixed" colliders="cuboid">
                            <Plane rotation={[-Math.PI / 2, 0, 0]} position={[-32, 0, 16]} args={[32, 32, 256, 256]} receiveShadow>
                                <DetailedMaterial {...detailedMaterials["rocks"]} />
                            </Plane>
                        </RigidBody>

                        <RigidBody type="fixed" colliders="cuboid">
                            <Plane position={[0, 0, 16]} rotation={[-Math.PI / 2, 0, 0]} args={[32, 32, 256, 256]}>
                                <TextureSplatMaterial textureScale={8} />
                            </Plane>
                        </RigidBody>

                        {/* <mesh position={[32, 0, 16]}>
                            <boxGeometry args={[32, 1, 32]} />
                            <WaterMaterial />
                        </mesh> */}

                        <Plane rotation={[-Math.PI / 2, 0, 0]} position={[32, 0, 16]} args={[32, 32, 256, 256]} receiveShadow>
                            <ShinyFloor />
                        </Plane>


                        {/* second row */}
                        <ColliderTerrain position={[0, 0, -16]}>
                            <DetailedMaterial {...detailedMaterials["sand"]} />
                        </ColliderTerrain>

                        {/* toys */}
                        <VertexVisualizer geometry={new PlaneGeometry(32, 32, 16, 16)} />
                        <Playground position={[0, 0, 12]} />

                        <ambientLight intensity={0.5} />
                        <pointLight position={[0, 100, 0]} intensity={20000} />
                        <PerspectiveCamera makeDefault position={[0, 30, 60]} zoom={1} />
                        <OrbitControls />
                    </Physics>

                </GameCanvas>
            </div>
        </div>
    );
}

// Component to render small rigidbody boxes at each vertex
function VertexVisualizer({ geometry }: { geometry: PlaneGeometry }) {
    const meshRef = useRef<InstancedMesh>(null);

    // Gather vertex positions
    const instances = useMemo(() => {
        const arr: {
            key: string;
            position: [number, number, number];
            rotation: [number, number, number];
        }[] = [];
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            arr.push({
                key: "vertex_" + i,
                position: [pos[i], pos[i + 1] + 2.5, pos[i + 2]] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
            });
        }
        return arr;
    }, [geometry]);

    return (
        <InstancedRigidBodies instances={instances} type="dynamic" colliders="cuboid">
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, instances.length]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshStandardMaterial color="red" />
            </instancedMesh>
        </InstancedRigidBodies>
    );
}
