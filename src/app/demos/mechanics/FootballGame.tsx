
import { forwardRef, useRef } from "react";

import { RigidBody } from "@react-three/rapier";
import { Mesh, Object3D } from "three";
import MapModel from "@/shared/MapModel";

export default forwardRef<Object3D | null>(function FootballGame(props, ref) {
    const ballRef = (ref as React.RefObject<Object3D | null>) || useRef<Object3D | null>(null);
    const ballRigidBodyRef = useRef<any>(null);

    const handleGoal = (scoringObject: Object3D) => {
        if (scoringObject === ballRef.current && ballRigidBodyRef.current) {
            console.log("GOAL!");
            ballRigidBodyRef.current.setTranslation({ x: 0, y: 8, z: 5 }, true);
            ballRigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            ballRigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
    };

    return <>
        <MapModel position={[0, 0, 5]} modelUrl="/models/maps/soccer.glb" />

        <Football ref={ballRef} rigidBodyRef={ballRigidBodyRef} position={[0, 8, 5]} />
        <GoalSensor position={[0, 1, -4]} onGoal={handleGoal} />
        <GoalSensor position={[0, 1, 14]} onGoal={handleGoal} />

    </>

});

const Football = forwardRef<Object3D, { position: [number, number, number], rigidBodyRef?: React.RefObject<any> }>(({ position, rigidBodyRef }, ref) => {
    return (
        <RigidBody ref={rigidBodyRef} ccd position={position} friction={1} restitution={1} colliders="ball" type="dynamic">
            <mesh castShadow receiveShadow ref={ref}>
                <sphereGeometry args={[0.1, 32, 32]} />
                <meshStandardMaterial color="white" />
            </mesh>
        </RigidBody>
    );
});

const GoalSensor = ({ position = [0, 0, 0], onGoal }: { position?: [number, number, number], onGoal: (scoringObject: Object3D) => void }) => {
    return (
        <RigidBody position={position} type="fixed" colliders="cuboid" sensor onIntersectionEnter={({ other }) => {
            const rigidBodyObject = other.rigidBodyObject;
            if (rigidBodyObject) {
                const meshChild = rigidBodyObject.children.find((child) => child instanceof Mesh);
                if (meshChild) {
                    onGoal(meshChild);
                }
            }
        }}>
            <mesh>
                <boxGeometry args={[3.8, 2, 0.2]} />
                <meshStandardMaterial color="blue" transparent opacity={0.3} />
            </mesh>
        </RigidBody>
    );
}