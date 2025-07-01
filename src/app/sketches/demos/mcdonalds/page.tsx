"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import Controls from "@/shared/ControlsProvider";
import MapModel from "../../floor/ground/ground/model";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import Ground from "../../floor/ground/ground/flat";
import { forwardRef } from "react";
import { WebGPUCanvas } from "@/shared/WebGPUCanvas";
import Ped from "../../controllers/click/ped/ped";
import { CharacterController } from "../../controllers/shouldercam/CharacterController";
import DialogCollider from "../../controllers/click/ped/DialogCollider";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <WebGPUCanvas shadows>
                        {/* <Perf /> */}
                        <ShadowLight debug camOffset={new Vector3(2, 10, 2)} />

                        <Physics>
                            <CharacterController lookTarget={ballRef} />

                            <GoalFollowingPed />

                            <MapModel scale={0.6} position={[-3, 2, 0]} modelUrl="/models/maps/burgerpiz.glb" />
                            {/* <Ground /> */}
                            <ambientLight intensity={0.8} />
                            <pointLight position={[10, 10, 10]} />
                        </Physics>
                    </WebGPUCanvas>
                </Controls>
            </div>
        </div >
    );
}

const Football = forwardRef<Object3D, { position: [number, number, number] }>(({ position }, ref) => {
    return (
        <RigidBody ccd position={position} friction={1} restitution={1} colliders="ball" type="dynamic">
            <mesh castShadow receiveShadow ref={ref}>
                <sphereGeometry args={[0.1, 32, 32]} />
                <meshStandardMaterial color="white" />
            </mesh>
        </RigidBody>
    );
});

const HeavyBox = forwardRef<Object3D, { position: [number, number, number] }>(({ position }, ref) => {
    return (
        <RigidBody name="box" ccd position={position} density={1} colliders="cuboid" type="dynamic">
            <mesh castShadow receiveShadow ref={ref}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="blue" />
            </mesh>
        </RigidBody>
    );
}
);

const GoalFollowingPed = () => {
    const [ballPosition, setBallPosition] = useState<[number, number, number]>([0, 2, 10]);
    const [dialogVisible, setDialogVisible] = useState(false);


    return <Ped modelUrl="rigga/rigga2.glb"
        position={ballPosition} modelOffset={[0, -0.5, 0]}
    />
}

