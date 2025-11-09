"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import { Html, MapControls, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import GameCanvas from "@/shared/GameCanvas";
import useGameStore, { allEntityIDsByType, Entity, getEntitiesByType, useEntityById } from "@/shared/providers/GameStore";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import Ped from "@/shared/ped/ped";
import DialogCollider from "@/shared/ped/DialogCollider";
import DebugGround from "@/shared/debug/DebugGround";
import DebugCamera from "@/shared/debug/DebugCamera";
import DraggableDiv from "@/shared/ui/DraggableDiv";
import NavigableWorld from "@/shared/navmesh/NavigableWorld";

export default function Home() {
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
            <div className="z-20 absolute top-0">
                <DraggableDiv position={[0, 20]}>
                    <div className="bg-black/50 p-2 rounded text-white flex w-[100px] flex justify-center">
                        <h2 className="font-bold">Demo</h2>
                    </div>
                </DraggableDiv>
            </div>
        </div>
    );
}

const randomPickupable = (pos?: [number, number]): Partial<Entity> => {
    const x = pos?.[0] ?? (Math.random() * 10 - 5);
    const z = pos?.[1] ?? (Math.random() * 10 - 5);
    return { type: 'pickupable', position: [x, 0, z] };
}

const GameEntityWorld = () => {
    const [selectedEntityID, setSelectedEntityID] = useState<string | undefined>(undefined);
    const { addEntity, resetWorld } = useGameStore();
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;

        resetWorld();

        addEntity(randomPickupable());
        addEntity(randomPickupable());
        addEntity(randomPickupable());

        addEntity({ name: 'PockitCEO', type: 'NPC', position: [1, 0, -4], basePath: "/models/human/rigga/", modelUrl: "rigga.glb", goal: 'follow' });
        addEntity({ name: 'Employee', type: 'NPC', position: [-1, 0, -4], goal: 'hunt' });

        initialized.current = true;
    }, [addEntity]);

    return <>
        <NavigableWorld>
            <DebugGround size={200} onClick={(e) => {
                addEntity(randomPickupable([e.point.x, e.point.z]));
                setSelectedEntityID(undefined);
            }} />
        </NavigableWorld>
        {allEntityIDsByType('NPC').map((id) => <TalkativeNPC key={id} id={id} />)}
        {allEntityIDsByType('pickupable').map((id) => <Pickupable key={id} id={id} />)}
    </>;
}


const TalkativeNPC = ({ id }: { id: string }) => {
    const { updateEntity, addEntity, removeEntity } = useGameStore();
    const entity = useEntityById(id);
    if (!entity) return null;

    const { name, position } = entity;

    const [playerRef, setPlayerRef] = useState<THREE.Object3D | null>(null);
    const { scene } = useThree();

    const [isTalking, setIsTalking] = useState(false);

    const walkToPlayer = () => {
        if (entity.goal !== 'follow') return;

        const player = scene.getObjectByName('player');
        if (player?.position) {
            const playerPosition = player?.position;
            walkTo([playerPosition.x + Math.random() * 2 - 1, 0, playerPosition.z + Math.random() * 2 - 1])
        } else {
            setTimeout(() => {
                walkToPlayer();
            }, 500);
        }
    };


    const walkTo = (position: [number, number, number]) => {
        updateEntity(id, { position: position });
    };

    const behaviors = {
        "follow": {
            enter: () => {
                walkToPlayer();
            },
            complete: () => {
                updateEntity(id, { goal: 'idle' });
                // setTimeout(() => {
                //     updateEntity(id, { goal: 'follow' });
                // }, 100);
            }
        },
        "hunt": {
            enter: () => {
                const cheese = getEntitiesByType('pickupable');
                if (cheese.length > 0) {
                    const cheeseEntity = cheese[0];
                    if (cheeseEntity && cheeseEntity.position) {
                        actionState.current = { type: 'hunt', target: cheeseEntity.id };
                        walkTo(cheeseEntity.position as [number, number, number]);
                    }
                } else {
                    // No cheese left, go idle
                    updateEntity(id, { goal: 'idle' });
                    setTimeout(() => {
                        updateEntity(id, { goal: 'hunt' });
                    }, 5000);
                }
            },
            complete: () => {
                if (actionState.current && actionState.current.type === 'hunt') {
                    removeEntity(actionState.current.target);
                }
                updateEntity(id, { goal: 'idle' });
                setTimeout(() => {
                    updateEntity(id, { goal: 'hunt' });
                }, 2000);
            }
        }
    }

    const actionState = useRef<any | null>(null);

    useEffect(() => {
        if (entity.goal in behaviors) {
            behaviors[entity.goal as keyof typeof behaviors].enter();
            reachedDestinationHandler.current = () => {
                behaviors[entity.goal as keyof typeof behaviors].complete();
                actionState.current = null;
            }
        } else {
            reachedDestinationHandler.current = () => { };
        }
    }, [entity.goal]);

    useEffect(() => {
        const player = scene.getObjectByName('player');
        if (player) {
            setPlayerRef(player as THREE.Object3D);
        } else {
            console.warn('Player object not found in scene');
        }
    }, [scene]);

    const reachedDestinationHandler = useRef<() => void>(() => { });


    if (!scene) return null;

    return <><Ped
        key={name}
        basePath={entity.basePath || "/models/human/onimilio/"}
        modelUrl={entity.modelUrl || "rigged.glb"}
        position={position} height={1.5}
        lookTarget={{ current: playerRef }}
        onDestinationReached={reachedDestinationHandler}
    >
        <Html center position={[0, 3, 0]} zIndexRange={[5, 10]}>
            <pre className="noscrollbar text-xs text-white bg-gray-800/70 w-[300px] rounded overflow-auto text-wrap">
                {Object.entries(entity).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}
            </pre>
        </Html>
        <DialogCollider onExit={() => { setIsTalking(false) }}>
            {!isTalking && <ActivationToggle onActivate={() => {
                setIsTalking(true);
            }} />}
            phi
        </DialogCollider>
    </Ped></>;
}

const ActivationToggle = ({ onActivate }: { onActivate: () => void }) => {
    return <div className="flex max-w-[200px] justify-center">
        <div className="bg-black/80 rounded-md scale-200 p-2 cursor-pointer" onClick={onActivate}>talk?</div>
    </div>;
}

const Pickupable = ({ id }: { id: string }) => {
    const entity = useEntityById(id);
    const { removeEntity } = useGameStore();

    if (!entity) return null;
    return <RigidBody position={entity.position}><mesh>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="orange" />
        <DialogCollider radius={0.2} onEnter={() => {
            console.log('Picked up item:', id);
            setTimeout(() => {
                removeEntity(id);
            }, 0);
        }} />
    </mesh></RigidBody>;
}