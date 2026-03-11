"use client";

import { useEffect, useRef, useState } from "react";
import { Physics, RigidBody } from "@react-three/rapier";
import { GameCanvas } from "react-three-game";
import useGameStore, { allEntityIDsByType, Entity, getEntitiesByType, useEntityById } from "@/shared/providers/GameEntityStore";

import DebugGround from "@/shared/ground/DebugGround";
import DebugCamera from "@/shared/cameras/DebugCamera";
import Playground from "@/shared/debug/Playground";
import NavigableWorld from "@/app/react-three-controller/navmesh/NavigableContext";
import NavigableAgent from "@/app/react-three-controller/navmesh/NavigableAgent";

export default function NavmeshExample() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
                        <GameEntityWorld />

                        <DebugCamera />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}

const randomPickupable = (pos?: [number, number]): Partial<Entity> => {
    const x = pos?.[0] ?? (Math.random() * 40 - 20);
    const z = pos?.[1] ?? (Math.random() * 40 - 20);
    return { type: 'pickupable', position: [x, 0.5, z] };
};

const INITIAL_AGENTS = [
    { id: 'agent-1', position: [-5, 0, -5] as [number, number, number] },
    { id: 'agent-2', position: [5, 0, -5] as [number, number, number] },
    { id: 'agent-3', position: [-5, 0, 5] as [number, number, number] },
    { id: 'agent-4', position: [5, 0, 5] as [number, number, number] },
    { id: 'agent-5', position: [0, 0, 0] as [number, number, number] },
];

// Separate component to subscribe to pickupable IDs
const PickupableList = () => {
    const pickupableIds = allEntityIDsByType('pickupable');
    return (
        <>
            {pickupableIds.map((id) => (
                <Pickupable key={id} id={id} />
            ))}
        </>
    );
};

const GameEntityWorld = () => {
    const { addEntity, resetWorld, removeEntity } = useGameStore();
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        resetWorld();
        for (let i = 0; i < 10; i++) {
            addEntity(randomPickupable());
        }
    }, [addEntity, resetWorld]);

    return (
        <>
            <NavigableWorld>
                <DebugGround size={200} onClick={(e) => addEntity(randomPickupable([e.point.x, e.point.z]))} />
                <Playground dynamic={false} position={[0, -1.8, 0]} />

                {INITIAL_AGENTS.map((agent) => (
                    <HuntingAgent
                        key={agent.id}
                        spawnPosition={agent.position}
                        onPickup={removeEntity}
                    />
                ))}
            </NavigableWorld>

            <PickupableList />
        </>
    );
};

// Agent that hunts for pickupables
const HuntingAgent = ({
    spawnPosition,
    onPickup
}: {
    spawnPosition: [number, number, number];
    onPickup: (entityId: string) => void;
}) => {
    const [target, setTarget] = useState<[number, number, number] | undefined>(undefined);
    const targetEntityIdRef = useRef<string | null>(null);

    const findNewTarget = () => {
        const pickupables = getEntitiesByType('pickupable');
        if (pickupables.length > 0) {
            const randomPickup = pickupables[Math.floor(Math.random() * pickupables.length)];
            if (randomPickup.position) {
                targetEntityIdRef.current = randomPickup.id;
                setTarget(randomPickup.position as [number, number, number]);
            }
        } else {
            targetEntityIdRef.current = null;
            setTarget([(Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30]);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(findNewTarget, 100 + Math.random() * 500);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <NavigableAgent
            position={spawnPosition}
            target={target}
            basePath="/models/human/onimilio/"
            model="/models/human/onimilio/rigged.glb"
            height={1.5}
            onTargetReached={() => {
                if (targetEntityIdRef.current) onPickup(targetEntityIdRef.current);
                setTimeout(findNewTarget, 300);
            }}
        />
    );
};

const Pickupable = ({ id }: { id: string }) => {
    const entity = useEntityById(id);

    if (!entity || !entity.position) return null;

    return (
        <RigidBody position={entity.position}>
            <mesh castShadow>
                <boxGeometry args={[0.4, 0.4, 0.4]} />
                <meshStandardMaterial color="orange" />
            </mesh>
        </RigidBody>
    );
};
