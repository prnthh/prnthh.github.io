"use client";

import { Physics } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import { Environment, Preload } from "@react-three/drei";
import Ground from "../../floor/ground/flat";
import { MapEntities, MapEntity } from "./MapEntity";
import Vehicle from "../../car/simple/car/base";
import { useThree } from "@react-three/fiber";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import SimpleModel from "@/shared/SimpleModel";
import Ped from "@/shared/ped/ped";
import DialogCollider from "@/shared/ped/DialogCollider";
import { CharacterController } from "@/shared/shouldercam/CharacterController";
import { ShadowLight } from "@/shared/lighting/ShadowLight";


export default function Home() {
    const [mapEntitiesState, setMapEntitiesState] = useState<MapEntity[]>([]);

    useEffect(() => {
        // Generate random trees and rocks
        const entities: MapEntity[] = [];
        const numTrees = 100;
        const numRocks = 80;
        const SPAWN_RADIUS = 10;
        // Trees
        for (let i = 0; i < numTrees; i++) {
            let pos: [number, number, number];
            do {
                pos = [
                    Math.random() * 50 - 25,
                    0,
                    Math.random() * 50 - 25
                ];
            } while (Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]) < SPAWN_RADIUS);
            entities.push({
                id: `tree-${i}`,
                gltf: '/models/environment/tree2.glb',
                transforms: {
                    pos,
                    scale: [0.66, 0.66, 0.66]
                }
            });
        }
        // Rocks
        for (let i = 0; i < numRocks; i++) {
            let pos: [number, number, number];
            do {
                pos = [
                    Math.random() * 50 - 25,
                    0,
                    Math.random() * 50 - 25
                ];
            } while (Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]) < SPAWN_RADIUS);
            entities.push({
                id: `rock-${i}`,
                gltf: '/models/environment/rocks.glb',
                transforms: {
                    pos,
                    scale: [0.18 * 0.66, 0.18 * 0.66, 0.18 * 0.66]
                }
            });
        }
        setMapEntitiesState(entities);
    }, []);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <GameCanvas>
                        <ShadowLight color="#d9c78b" intensity={1} camOffset={new Vector3(0, 10, 0)} />

                        <Physics>
                            <Ground image="/textures/floor/terrain/dirt-512.jpg" />

                            <Actors />
                            <hemisphereLight intensity={0.4} color={'#cccccc'} groundColor={"#000000"} />

                            <MapEntities mapEntities={mapEntitiesState} />

                            {/* <SimpleModel scale={1} position={[4, 0, 0]} model="/models/environment/lamppost2.glb" /> */}
                        </Physics>

                        <fogExp2 attach="fog" args={["#000000", 0.03]} />
                        <color attach="background" args={["#3d3c39"]} />
                        <Environment preset="night" background={true} backgroundIntensity={0.2} environmentIntensity={0.5} blur={0.01} />
                    </GameCanvas>
                </Controls>
            </div>
        </div >
    );
}

const Actors = () => {
    const ballRef = useRef<Object3D | null>(null);
    const [playerState, setPlayerState] = useState<string | undefined>(undefined);

    return <>
        <GoalFollowingPed />
        <GoalCompletingPed />
        {playerState == undefined && <CharacterController lookTarget={ballRef} />}

        <DrivableCar name={'car1'} position={[5, 1, 4]} setPlayerState={setPlayerState} />
        <DrivableCar name={'car2'} position={[8, 1, 4]} setPlayerState={setPlayerState} />
    </>
}

const GoalFollowingPed = () => {
    const [goalPosition, setGoalPosition] = useState<[number, number, number]>([0, 2, 10]);
    const { scene } = useThree();


    useEffect(() => {
        const interval = setInterval(() => {
            const bob = scene.getObjectByName("bob");
            if (bob) {
                const { x, y, z } = bob.position;
                setGoalPosition([x, y, z]);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return <Ped modelUrl="rigga/rigga2.glb"
        position={goalPosition} modelOffset={[0, -0.5, 0]}
    >
        <DialogCollider>
            Tralalero tralala
        </DialogCollider>

    </Ped>
}

const GoalCompletingPed = () => {
    const [goalPosition, setGoalPosition] = useState<[number, number, number]>([0, 2, 10]);
    const { scene } = useThree();


    useEffect(() => {
        const interval = setInterval(() => {
            const bob = scene.getObjectByName("bob");
            if (bob) {
                const { x, y, z } = bob.position;
                setGoalPosition([x, y, z]);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return <Ped modelUrl="rigga/rigga2.glb"
        position={goalPosition} modelOffset={[0, -0.5, 0]}
    >
        <DialogCollider>
            Tralalero tralala
        </DialogCollider>

    </Ped>
}

const DrivableCar = ({ position = [2, 5, 4], setPlayerState, name }: {
    position?: [number, number, number],
    setPlayerState?: (state: string | undefined) => void
    name?: string
}) => {
    const [canEnter, setCanEnter] = useState(false);
    const [isDriving, setIsDriving] = useState(false);

    // Listen for 'e' to enter only when canEnter && !isDriving
    useEffect(() => {
        let handler: ((event: KeyboardEvent) => void) | null = null;
        if (canEnter && !isDriving) {
            handler = (event: KeyboardEvent) => {
                if (event.key === 'e') setIsDriving(true);
            };
        } else if (isDriving) {
            handler = (event: KeyboardEvent) => {
                if (event.key === 'e') {
                    setIsDriving(false);
                    setCanEnter(false); // Prevent immediate re-entry after exit
                }
            };
        }
        if (handler) window.addEventListener('keydown', handler);
        return () => {
            if (handler) window.removeEventListener('keydown', handler);
        };
    }, [canEnter, isDriving]);

    useEffect(() => {
        setPlayerState?.(isDriving ? "driving" : undefined);
    }, [isDriving, setPlayerState]);

    return <><Preload all />
        <Vehicle
            name={name || "drivable-car"}
            spawn={{
                position: position || [2, 0, 4],
                rotation: [0, Math.PI / 2, 0]
            }}
            driving={isDriving}
            chassisModel="/models/cars/taxi/chassis.glb"
            wheelModel="/models/cars/taxi/wheel.glb"
        >
            {!isDriving && <DialogCollider height={1} radius={2}
                onEnter={() => setCanEnter(true)} onExit={() => setCanEnter(false)}
            >
                <button onClick={() => setIsDriving(true)} className="bg-yellow-300 text-black p-2 rounded text-sm w-[600px]]">
                    press e to enter
                </button>
            </DialogCollider>
            }
        </Vehicle>
    </>
}
