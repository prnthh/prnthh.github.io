"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import Controls from "@/shared/ControlsProvider";
import { CharacterController } from "./CharacterController";
import MapModel from "../../floor/ground/ground/model";
import { ShadowLight } from "../../lighting/shadowmap/ShadowLight";
import { useRef, useState, useEffect } from "react";
import { Object3D } from "three";
import Ped from "../click/ped/ped";
import Ground from "../../floor/ground/ground/flat";
import DialogCollider from "./DialogCollider";
import { Perf } from "r3f-perf";
import { forwardRef } from "react";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls >
                    <Canvas shadows>
                        <Perf />
                        <ShadowLight />

                        <Physics>
                            <CharacterController lookTarget={ballRef} />

                            <Football ref={ballRef} position={[5, 0.1, 0]} />

                            <GoalFollowingPed ballRef={ballRef} />

                            <MapModel />
                            {/* <Ground /> */}
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                        </Physics>
                    </Canvas>
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

const GoalFollowingPed = ({ ballRef }: { ballRef: React.RefObject<Object3D | null> }) => {
    const [ballPosition, setBallPosition] = useState<[number, number, number]>([5, 0, 0]);

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

    return <DialogCollider dialog={<div className="text-3xl text-yellow-300 text-center p-2 rounded drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
        hi
    </div>}>
        <Ped modelUrl="rigga/rigga2.glb" position={ballPosition} modelOffset={[0, -0.5, 0]} lookTarget={ballRef} />
    </DialogCollider>
}

