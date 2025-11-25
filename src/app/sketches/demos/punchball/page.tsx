"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import MapModel from "@/shared/MapModel";
import { useRef, useState, useEffect } from "react";
import { Object3D, Vector3 } from "three";
import { forwardRef } from "react";
import GameCanvas from "@/shared/GameCanvas";
import Controls from "@/shared/controls/ControlsProvider";
import Ped from "@/shared/ped/physics/ped";
import DialogCollider from "@/shared/ped/physics/DialogCollider";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import Balloon from "@/shared/physics/Balloon";
import { ThirdPersonController } from "../../controllers/thirdperson/ThirdPersonController";
import { Csm } from "@/shared/Csm";

export default function Home() {
    const ballRef = useRef<Object3D | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        {/* <Perf /> */}
                        <Csm />
                        <Physics>
                            <ThirdPersonController lookTarget={ballRef} />

                            <Football ref={ballRef} position={[0, 8, 5]} />

                            <PunchingBag position={[5, 2, 0]} />
                            <GoalFollowingPed ballRef={ballRef} />

                            <MapModel position={[0, 0, 5]} modelUrl="/models/maps/soccer.glb" />
                            <ambientLight intensity={0.8} />
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

const PunchingBag = ({ position = [0, 0, 0] }: { position?: [number, number, number] }) => {
    return <>
        <Balloon position={[5, 2, 5]}>
            <mesh castShadow receiveShadow >
                <capsuleGeometry args={[0.2, 0.8]} />
                <meshStandardMaterial color="red" />
            </mesh>
        </Balloon>
    </>
};

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

    return <Ped model="rigga/rigga2.glb" position={ballPosition} modelOffset={[0, -0.5, 0]} lookTarget={ballRef}>
        <DialogCollider>Ole!</DialogCollider>
    </Ped>
}

