"use client";

import { CylinderCollider, Physics } from "@react-three/rapier";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";
import { useRef, useState, useEffect, Suspense } from "react";
import { Object3D, Vector3 } from "three";
import { CharacterController } from "../../controllers/shouldercam/CharacterController";
import { GameCanvas } from "@/shared/GameCanvas";
import { Terrain } from "../../floor/ground/ground/DSGround";
import { Environment, Html } from "@react-three/drei";
import Ground from "../../floor/ground/ground/flat";
import { MapEntities, MapEntity } from "./MapEntity";
import Ped from "../../controllers/click/ped/ped";
import Vehicle from "../../car/simple/car/base";
import DialogCollider from "../../controllers/click/ped/DialogCollider";
;

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);

    const [mapEntitiesState, setMapEntitiesState] = useState<MapEntity[]>([]);

    useEffect(() => {
        // Generate random trees and rocks
        const entities: MapEntity[] = [];
        const numTrees = 10;
        const numRocks = 8;
        // Trees
        for (let i = 0; i < numTrees; i++) {
            entities.push({
                id: `tree-${i}`,
                gltf: '/models/environment/tree2.glb',
                transforms: {
                    pos: [
                        Math.random() * 20 - 10, // x: -10 to 10
                        0,
                        Math.random() * 20 - 10 // z: -10 to 10
                    ],
                    scale: [0.66, 0.66, 0.66]
                }
            });
        }
        // Rocks
        for (let i = 0; i < numRocks; i++) {
            entities.push({
                id: `rock-${i}`,
                gltf: '/models/environment/rocks.glb',
                transforms: {
                    pos: [
                        Math.random() * 20 - 10, // x: -10 to 10
                        0,
                        Math.random() * 20 - 10 // z: -10 to 10
                    ],
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
                    <GameCanvas shadows>
                        {/* <Perf /> */}
                        <ShadowLight debug camOffset={new Vector3(5, 10, 10)} />

                        <Physics>
                            <CharacterController lookTarget={ballRef} />
                            {/* <Terrain /> */}
                            <Ground />
                            {/* <ambientLight intensity={0.5} /> */}

                            <GoalFollowingPed />

                            <Suspense fallback={null}>
                                <DrivableCar />
                                <DrivableCar position={[5, 2, 4]} />
                            </Suspense>
                            <MapEntities mapEntities={mapEntitiesState} />
                        </Physics>

                        <fog attach="fog" args={["#8cb8ff", 20, 30]} />
                        <color attach="background" args={["#8cb8ff"]} />
                        <Environment preset="park" background={true} blur={0.5} />
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
        }, 3000);
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

