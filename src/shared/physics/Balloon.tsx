import { useThree } from "@react-three/fiber";
import { RapierRigidBody, RigidBody, useRapier, useSphericalJoint } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import { Box3, Vector3 } from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import HitBox from "./HitBox";

export default function Balloon({ position = [0, 1.5, 0], children }: { position?: [number, number, number], children?: React.ReactNode }) {
    const bodyA = useRef<RapierRigidBody>(null);
    const bodyB = useRef<RapierRigidBody>(null);
    const childMeshRef = useRef<any>(null);
    const { world } = useRapier();

    useEffect(() => {
        if (world && childMeshRef.current && bodyA.current && bodyB.current) {
            const box = new Box3().setFromObject(childMeshRef.current);
            const size = new Vector3();
            box.getSize(size);
            // Add offset to prevent collision with the box above
            const jointHeight = (size.y / 2) + 0.3;

            const params = RAPIER.JointData.spherical(
                { x: 0, y: 0, z: 0 },
                { x: 0, y: jointHeight, z: 0 }
            );
            const joint = world.createImpulseJoint(params, bodyA.current, bodyB.current, true);
            return () => {
                if (joint) world.removeImpulseJoint(joint, true);
            };
        }
    }, [children, world]);

    return (
        <group position={position}>
            <HitBox key={2} ref={bodyA} onHit={() => { }} />
            <RigidBody ref={bodyB} name="box">
                <mesh castShadow ref={childMeshRef}>
                    <boxGeometry args={[0.1, 0.6, 0.1]} />
                    <meshStandardMaterial color="orange" />
                    {children}
                </mesh>
            </RigidBody>
        </group>
    );
}
