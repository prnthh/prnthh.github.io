import { useThree } from "@react-three/fiber";
import { RapierRigidBody, RigidBody, useRapier, useSphericalJoint } from "@react-three/rapier";
import { useRef } from "react";
import HitBox from "./HitBox";

export default function Balloon({ position = [0, 5, 0], children }: { position?: [number, number, number], children?: React.ReactNode }) {
    const { scene } = useThree();
    const { world, rapier } = useRapier();
    const bodyA = useRef<RapierRigidBody>(null);
    const bodyB = useRef<RapierRigidBody>(null);

    // @ts-expect-error nullable its okay
    const joint = useSphericalJoint(bodyA, bodyB, [
        // Position of the joint in bodyA's local space
        [0, 0, 0],
        // Position of the joint in bodyB's local space
        [0, 0.6, 0],
        undefined,
        5,
        0.2
    ]);

    return (
        <group position={position}>
            <HitBox key={2} ref={bodyA} onHit={() => { }} />
            <RigidBody ref={bodyB}>
                <mesh castShadow>
                    <boxGeometry args={[0.1, 0.6, 0.1]} />
                    <meshStandardMaterial color="orange" />
                    {children}
                </mesh>
            </RigidBody>
        </group>
    );
}
