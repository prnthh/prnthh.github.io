"use client";

import { BallCollider, CuboidCollider, InstancedRigidBodies, InstancedRigidBodyProps, Physics, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { MathUtils } from "three";
import * as THREE from "three";
import { Canvas, extend } from "@react-three/fiber";
import GameCanvas from "@/shared/GameCanvas";

extend({ InstancedMesh2 });

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>
                        <Scene COUNT={4} />
                        <RigidBody type="fixed">
                            <mesh position={[0, -2, 0]} scale={[100, 0.1, 100]} receiveShadow>
                                <boxGeometry />
                                <meshStandardMaterial color="gray" />
                            </mesh>
                        </RigidBody>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
                        <OrbitControls />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}

function InstancedThing({ instances }: { instances: number }) {
    const ref = useRef<THREE.InstancedMesh>(null!)
    useEffect(() => {
        ref.current.setMatrixAt(0, new THREE.Matrix4())
    }, [])
    return (
        <instancedMesh ref={ref} args={[undefined, undefined, instances]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshNormalMaterial />
        </instancedMesh>
    )
}

const Scene = ({ COUNT }: { COUNT: number }) => {
    const rigidBodies = useRef<RapierRigidBody[] | null>(null);

    useEffect(() => {
        if (!rigidBodies.current) {
            return;
        }

        // You can access individual instanced by their index
        // rigidBodies.current[0].applyImpulse({ x: 0, y: 10, z: 0 }, true);
        // rigidBodies.current.at(1)?.applyImpulse({ x: 0, y: 10, z: 0 }, true);

        // Or update all instances
        rigidBodies.current.forEach((api, i) => {
            api.applyImpulse({ x: i, y: 0, z: 0 }, true);
        });
    }, [rigidBodies.current]);

    // We can set the initial positions, and rotations, and scales, of
    // the instances by providing an array of InstancedRigidBodyProps
    // which is the same as RigidBodyProps, but with an additional "key" prop.
    const instances = useMemo(() => {
        const instances: InstancedRigidBodyProps[] = [];

        for (let i = 0; i < COUNT; i++) {
            instances.push({
                key: "instance_" + Math.random(),
                position: [0, 2, -i * 2],
                rotation: [Math.random(), Math.random(), Math.random()]
            });
        }

        return instances;
    }, []);

    return (
        <InstancedRigidBodies ref={rigidBodies} instances={instances}
            // colliders=''
            colliders="ball"
        // colliderNodes={[
        //     <BallCollider args={[0.5]} />
        // ]}
        >
            <InstancedThing instances={COUNT} />
        </InstancedRigidBodies>
    );
};