"use client";

import { Physics } from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import { Preload } from "@react-three/drei";
import ImageGround from "@/shared/ground/ImageGround";
import { MapEntities, MapEntity } from "./MapEntity";
import Vehicle from "../../car/simple/car/base";
import { useThree } from "@react-three/fiber";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import Ped from "@/shared/ped/ped";
import DialogCollider from "@/shared/ped/DialogCollider";
import { CharacterController } from "@/shared/shouldercam/CharacterController";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import DrivableCar from "../../car/simple/DrivableCar";


export default function Home() {


    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <GameCanvas>
                        <ShadowLight color="#d9c78b" intensity={1} camOffset={new Vector3(0, 10, 0)} />

                        <Physics>
                            <ImageGround image="/textures/floor/terrain/dirt-512.jpg" />

                            <Actors />
                            <hemisphereLight intensity={0.4} color={'#cccccc'} groundColor={"#000000"} />

                            {/* <SimpleModel scale={1} position={[4, 0, 0]} model="/models/environment/lamppost2.glb" /> */}
                        </Physics>

                        <fogExp2 attach="fog" args={["#000000", 0.03]} />
                        <color attach="background" args={["#3d3c39"]} />
                    </GameCanvas>
                </Controls>
            </div>
        </div >
    );
}

const Actors = () => {
    const ballRef = useRef<Object3D | null>(null);

    return <>
        <GoalFollowingPed />
        <GoalCompletingPed />
        <CharacterController lookTarget={ballRef} />
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

