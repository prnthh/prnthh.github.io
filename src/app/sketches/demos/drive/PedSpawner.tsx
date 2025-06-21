import { RapierRigidBody } from "@react-three/rapier";
import { useEffect, useState } from "react";
import Ped from "../../controllers/click/ped/ped";
import { ObjectRef } from "../../car/simple/car/base";
import * as THREE from "three";

type PedSpawnerProps = {
    carRBRef: React.RefObject<ObjectRef | null>;
};

const PedSpawner = ({ carRBRef }: PedSpawnerProps) => {
    const [npcs, setNpcs] = useState<{ position: [number, number, number] }[]>([]);

    useEffect(() => {
        if (!carRBRef.current) return; // Wait until carRBRef.current is set
        console.log("car found", carRBRef.current);
        const interval = setInterval(() => {
            const car = carRBRef.current;
            if (car && car.meshRef && car.rbRef) {
                const translation = car.meshRef.getWorldPosition(new THREE.Vector3());
                const rotation = car.meshRef.getWorldQuaternion(new THREE.Quaternion());
                // Calculate forward vector using quaternion
                const forwardVec = new THREE.Vector3(-1, 0, 0).applyQuaternion(rotation).normalize();
                // Place NPC 5 units in front of car
                const spawnPos: [number, number, number] = [
                    translation.x + forwardVec.x * 5,
                    translation.y + 1,
                    translation.z + forwardVec.z * 5
                ];
                console.log("Spawning NPC at", spawnPos);
                setNpcs((prev) => [...prev, { position: spawnPos }]);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [carRBRef]); // Depend on carRBRef

    return (
        <>
            {npcs.map((npc, i) => (
                <PedBehavior key={i} npc={npc} />
            ))}
        </>
    );
};

const PedBehavior = ({ npc }: { npc: { position: [number, number, number] } }) => {
    const [position, setPosition] = useState<[number, number, number]>(npc.position);

    useEffect(() => {
        const interval = setInterval(() => {
            // Generate a new point near the old point (within 2 units in x/z, y stays the same)
            setPosition(prev => {
                const dx = (Math.random() - 0.5) * 4; // -2 to 2
                const dz = (Math.random() - 0.5) * 4; // -2 to 2
                return [prev[0] + dx, prev[1], prev[2] + dz];
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return <Ped modelOffset={[0, -0.5, 0]} modelUrl="/rigga/rigga2.glb" position={position} />;
}

export default PedSpawner;