import { RapierRigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useState } from "react";
import Ped from "../../controllers/click/ped/ped";
import { ObjectRef } from "../../car/simple/car/base";
import * as THREE from "three";

type PedSpawnerProps = {
    carRBRef: React.RefObject<ObjectRef | null>;
};

type NpcType = { id: string; position: [number, number, number] };

const PedSpawner = ({ carRBRef }: PedSpawnerProps) => {
    const [npcs, setNpcs] = useState<NpcType[]>([]);

    useEffect(() => {
        if (!carRBRef.current) return; // Wait until carRBRef.current is set
        console.log("car found", carRBRef.current);
        let pedId = 0; // Unique id for each ped
        const interval = setInterval(() => {
            const car = carRBRef.current;
            if (car && car.meshRef && car.rbRef) {
                const translation = car.meshRef.getWorldPosition(new THREE.Vector3());
                const rotation = car.meshRef.getWorldQuaternion(new THREE.Quaternion());
                // Calculate forward vector using quaternion
                const forwardVec = new THREE.Vector3(-1, 0, 0).applyQuaternion(rotation).normalize();
                // Spawn 2-4 NPCs each time, at varying distances ahead
                const numToSpawn = 1 //Math.floor(Math.random() * 3) + 2; // 2 to 4
                const newNpcs = Array.from({ length: numToSpawn }, () => {
                    // Distance ahead: 10 to 40 units
                    const distAhead = 10 + Math.random() * 30;
                    // Lateral offset: -8 to +8
                    const lateral = (Math.random() - 0.5) * 16;
                    // Calculate spawn position in front of car, with lateral offset
                    const forward = forwardVec.clone().multiplyScalar(distAhead);
                    const rightVec = new THREE.Vector3(0, 1, 0).cross(forwardVec).normalize();
                    const lateralOffset = rightVec.multiplyScalar(lateral);
                    const spawnPosVec = translation.clone().add(forward).add(lateralOffset);
                    pedId += 1;
                    return { id: pedId + '_' + Date.now() + '_' + Math.random(), position: [spawnPosVec.x, translation.y + 1, spawnPosVec.z] as [number, number, number] };
                });
                setNpcs((prev) => {
                    const combined = [...prev, ...newNpcs];
                    // If more than 40, remove the oldest
                    if (combined.length > 40) {
                        return combined.slice(combined.length - 40);
                    }
                    return combined;
                });
            }
        }, 1500); // Increased frequency (was 5000)
        return () => clearInterval(interval);
    }, [carRBRef]); // Depend on carRBRef

    return (
        <>
            {npcs.map((npc) => (
                <Suspense key={npc.id} ><PedBehavior npc={npc} /></Suspense>
            ))}
        </>
    );
};
const PedBehavior = ({ npc }: { npc: NpcType }) => {
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