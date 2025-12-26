import { Physics, RigidBody } from "@react-three/rapier";
import OtherPlayers from "@/shared/multiplayer/OtherPlayers";
import LocalPlayer from "@/shared/multiplayer/LocalPlayer";
import { Html } from "@react-three/drei";
import { useTimeRNGNumber } from "./TimeRNG";
import Balloon from "@/shared/physics/Balloon";
import { PrefabRoot, Prefab } from "react-three-game";
import { useEffect, useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";
import HitBox from "@/shared/physics/HitBox";
import Ped from "@/shared/ped/physics/ped";
import ModelAttachment from "@/shared/ped/ModelAttachment";
import { Object3D } from "three";



export default function Game({ loadedMap, isMultiplayer }: { loadedMap: Prefab, isMultiplayer: boolean, onCanvasReady?: () => void }) {
    const playerRef = useRef<Object3D>(null);

    return <>
        <Physics>
            <PrefabRoot data={loadedMap} />
            <LocalPlayer playerRef={playerRef} />

            <Train />

            <group position={[-2, 0, -15]}>
                <RandomNumberExample />

                <Balloon position={[0, 1, 0]} />
                <HitBox debug key={2} position={[1, 1, 0]} />
                <HitBox debug key={3} position={[2, 1, 0]} />
                <HitBox debug key={4} position={[3, 1, 0]} />
                <Balloon position={[4, 1, 0]} />
            </group>

            {!isMultiplayer && <PedSpawner playerRef={playerRef} position={[0, 0, -10]} />}
            {isMultiplayer && <OtherPlayers />}
        </Physics>
    </>
}


const PedSpawner = ({ position = [0, 0, 0], playerRef }: { position?: [number, number, number], playerRef: React.RefObject<Object3D | null> }) => {
    const [peds, setPeds] = useState<{ id: number, position: [number, number, number], dead?: boolean }[]>([
        { id: 1, position: position }
    ]);
    const maxPeds = 10;
    const nextIdRef = useRef(2);

    const handlePedShot = useCallback((id: number) => {
        // Mark as dead
        setPeds(prev => prev.map(p => p.id === id ? { ...p, dead: true } : p));

        // Spawn a new ped if under max
        setPeds(prev => {
            if (prev.length < maxPeds) {
                return [...prev, {
                    id: nextIdRef.current++,
                    position: position
                }];
            }
            return prev;
        });

        // Remove the dead ped after 5 seconds
        setTimeout(() => {
            setPeds(prev => prev.filter(p => p.id !== id));
        }, 5000);
    }, [position]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current) {
                const pos = new Object3D();
                playerRef.current.getWorldPosition(pos.position);
                setPeds(prevPeds =>
                    prevPeds.map(ped =>
                        ped.dead ? ped : {
                            ...ped,
                            position: [pos.position.x, pos.position.y, pos.position.z]
                        }
                    )
                );
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [playerRef]);

    return <>{peds.map(ped => <Ped
        key={ped.id}
        modelOffset={[0, -0.5, 0]}
        position={ped.position}
        model="rigga/rigga2.glb"
        onShot={() => handlePedShot(ped.id)}
    >
        {/* <DialogCollider radius={3} height={1.2}>Ah hello</DialogCollider> */}
        <ModelAttachment
            model="/models/environment/Katana.glb"
            attachpoint="mixamorigRightHand"
            offset={[2, 0, 0]}
            scale={[100, 100, 100]}
            rotation={[0.7, 0, -1]}
        />
    </Ped>)}</>
}

const Train = ({ position = [10, 0, -10] }: { position?: [number, number, number] }) => {
    const rbRef = useRef<RapierRigidBody>(null);
    const goingUp = useRef(false);
    const waitTime = useRef(0);

    useFrame((_, delta) => {
        if (!rbRef.current) return;

        const currentY = rbRef.current.translation().y;

        // Check if we've reached an end
        if ((currentY >= 9 && goingUp.current) || (currentY <= 0 && !goingUp.current)) {
            // Stop and wait
            rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            waitTime.current += delta;

            // After 5 seconds, switch direction
            if (waitTime.current >= 5) {
                goingUp.current = !goingUp.current;
                waitTime.current = 0;
            }
        } else if (waitTime.current === 0) {
            // Moving
            rbRef.current.setLinvel({ x: 0, y: goingUp.current ? 10 : -10, z: 0 }, true);
        }
    });

    return <RigidBody ref={rbRef} type='kinematicVelocity' position={position}>
        <mesh castShadow>
            <boxGeometry args={[4, 0.1, 8]} />
            <meshStandardMaterial color="red" />
        </mesh>
    </RigidBody>
}

const RandomNumberExample = () => {
    const randomNum = useTimeRNGNumber({ min: 0, max: 100 });
    const randomNum2 = useTimeRNGNumber({ min: 0, max: Math.PI * 2, seedOffset: 42 });

    return <>
        <Html transform className="flex gap-x-2 flex-col items-center" position={[2, 2, 0]}>
            today's random numbers: <br />
            <div className="">
                {randomNum.toFixed()} and {randomNum2.toFixed()}

            </div>
        </Html>
    </>
}