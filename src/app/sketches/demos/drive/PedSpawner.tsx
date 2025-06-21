import { RapierRigidBody } from "@react-three/rapier";
import { useEffect, useState } from "react";
import Ped from "../../controllers/click/ped/ped";

type PedSpawnerProps = {
    carRBRef: React.RefObject<RapierRigidBody | null>;
};

const PedSpawner = ({ carRBRef }: PedSpawnerProps) => {
    const [npcs, setNpcs] = useState<{ position: [number, number, number] }[]>([]);

    useEffect(() => {
        if (!carRBRef.current) { console.log("car not found"); return; }
        console.log("car found", carRBRef.current);
        const interval = setInterval(() => {
            const car = carRBRef.current;
            if (car) {
                const translation = car.translation();
                const rotation = car.rotation();
                // Calculate forward vector from quaternion
                const q = rotation;
                // Forward vector for Z-
                const forward = [
                    2 * (q.x * q.z + q.w * q.y),
                    2 * (q.y * q.z - q.w * q.x),
                    1 - 2 * (q.x * q.x + q.y * q.y)
                ];
                // Normalize forward
                const len = Math.sqrt(forward[0] * forward[0] + forward[1] * forward[1] + forward[2] * forward[2]);
                const normForward = forward.map((v) => v / len);
                // Place NPC 5 units in front of car
                const spawnPos: [number, number, number] = [
                    translation.x + normForward[0] * 5,
                    translation.y + 1,
                    translation.z + normForward[2] * 5
                ];
                console.log("Spawning NPC at", spawnPos);
                setNpcs((prev) => [...prev, { position: spawnPos }]);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [carRBRef]);

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