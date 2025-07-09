"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import Controls from "@/shared/ControlsProvider";
import MapModel from "../../floor/ground/ground/model";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import { forwardRef } from "react";
import Ped from "../../controllers/click/ped/ped";
import { CharacterController } from "../../controllers/shouldercam/CharacterController";
import DialogCollider from "../../controllers/click/ped/DialogCollider";
import { Environment } from "@react-three/drei";
import { GameCanvas } from "@/shared/GameCanvas";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <GameCanvas shadows>
                        {/* <Perf /> */}
                        <ShadowLight intensity={4} debug camOffset={new Vector3(2, 10, 2)} />

                        <Physics>
                            <CharacterController lookTarget={ballRef} />

                            <Football ref={ballRef} position={[0, 8, 5]} />

                            <HeavyBox position={[5, 2, 0]} />

                            <GoalFollowingPed ballRef={ballRef} />

                            <MapModel position={[0, 0, 5]} modelUrl="/models/maps/soccer.glb" />
                            <Environment files="/terraindemo/sunflowers_puresky_1k.hdr" environmentIntensity={0.2} background={true} ground />
                            <ambientLight intensity={0.5} />
                            {/* <pointLight position={[10, 10, 10]} /> */}
                        </Physics>
                    </GameCanvas>
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

const GoalFollowingPed = ({ ballRef }: { ballRef: React.RefObject<Object3D | null> }) => {
    const [ballPosition, setBallPosition] = useState<[number, number, number]>([0, 2, 10]);
    const [dialogVisible, setDialogVisible] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            if (ballRef.current) {
                const pos = new Object3D();
                ballRef.current.getWorldPosition(pos.position);
                setBallPosition([pos.position.x, pos.position.y, pos.position.z]);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [ballRef]);

    return <Ped modelUrl="rigga/rigga2.glb" position={ballPosition} modelOffset={[0, -0.5, 0]} lookTarget={ballRef}>
        <DialogCollider>Ole!</DialogCollider>
    </Ped>
}

