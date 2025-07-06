"use client";

import { Physics } from "@react-three/rapier";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";
import { useRef, useState, useEffect, Suspense } from "react";
import { HemisphereLight, Object3D, PCFShadowMap, Vector3 } from "three";
import { CharacterController } from "../../controllers/shouldercam/CharacterController";
import { GameCanvas } from "@/shared/GameCanvas";
import { Environment, Html, Stats } from "@react-three/drei";
import Ground from "../../floor/ground/ground/flat";
import { MapEntities, MapEntity } from "./MapEntity";
import Ped from "../../controllers/click/ped/ped";
import Vehicle from "../../car/simple/car/base";
import DialogCollider from "../../controllers/click/ped/DialogCollider";


export default function Home() {
    const ballRef = useRef<Object3D | null>(null);

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
                        {/* <Perf /> */}
                        <ShadowLight color="#d9c78b" intensity={1} camOffset={new Vector3(0, 10, 0)} />

                        <Physics>
                            <CharacterController lookTarget={ballRef} />
                            <Ground image="/textures/floor/terrain/dirt-512.jpg" />
                            {/* <hemisphereLight intensity={0.4} color={'#cccccc'} groundColor={"#000000"} /> */}
                            <GoalFollowingPed />

                            <Suspense fallback={null}>
                                <DrivableCar />
                                <DrivableCar position={[5, 2, 4]} />
                            </Suspense>
                            <MapEntities mapEntities={mapEntitiesState} />
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

const GoalFollowingPed = () => {
    const [goalPosition, setGoalPosition] = useState<[number, number, number]>([0, 2, 10]);

    useEffect(() => {
        const interval = setInterval(() => {
            setGoalPosition([
                Math.random() * 20 - 10,
                2,
                Math.random() * 20 - 10
            ]);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return <Ped modelUrl="rigga/rigga2.glb"
        position={goalPosition} modelOffset={[0, -0.5, 0]}
    >
        <DialogCollider />

    </Ped>
}

const DrivableCar = ({ position }: { position?: [number, number, number] } = { position: [2, 5, 4] }
) => {
    const [dialogVisible, setDialogVisible] = useState(false);
    return <Vehicle
        spawn={{
            position: position || [2, 0, 4],
            rotation: [0, Math.PI / 2, 0]
        }}
        driving={false}
        // ref={carRBRef}
        chassisModel="/models/cars/taxi/chassis.glb"
        wheelModel="/models/cars/taxi/wheel.glb"
    />
}

