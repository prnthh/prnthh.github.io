"use client";

import { Physics } from "@react-three/rapier";
import { useState, useRef } from "react";
import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import { GameCanvas } from "react-three-game";
import { Box, OrbitControls } from "@react-three/drei";
import CombinedController from "@/app/react-three-controller/combined/CombinedController";
import { PrefabRoot } from "react-three-game";
import DebugGround from "@/shared/ground/DebugGround";
import { useFrame } from "@react-three/fiber";
import Ped from "@/app/react-three-controller/ped/ped";
import room from "@/app/sketches/tools/prefabeditor/samples/room.json";


export default function Home() {
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);
    const characterRef = useRef<any>(null);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics>
                            <PrefabRoot
                                onSelect={(id) => {
                                    console.log("selected prefab root", id);
                                }}
                                data={room} />
                            <ambientLight intensity={1.5} />
                            <DebugGround position={[0, -0.99, 0]} onClick={(e) => { setTarget([e.point.x, e.point.y, e.point.z]) }} />

                            {target && (
                                <Box receiveShadow position={target} args={[0.1, 0.1, 0.1]} castShadow />
                            )}

                            <CombinedController ref={characterRef} mode={"click"} target={target} />
                            {<SidewaysFollowCamera characterRef={characterRef} />}

                            <Ped modelOffset={[0, -0.82, 0]} height={0.6} position={[2, 0, 2]} model="rigga/rigga2.glb" />
                        </Physics>
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}

const SidewaysFollowCamera = ({ characterRef }: { characterRef: React.RefObject<any> }) => {
    const orbitRef = useRef<any>(null);
    const targetCameraX = useRef(0);
    const tolerance = 1;

    useFrame(({ camera }) => {
        if (orbitRef.current && characterRef.current?.rigidBodyRef?.current) {
            const characterPos = characterRef.current.rigidBodyRef.current.translation();

            // Calculate the offset between character and camera target
            const offset = characterPos.x - targetCameraX.current;

            // Only move camera if character is outside the tolerance zone
            if (Math.abs(offset) > tolerance) {
                // Move camera to keep character at edge of tolerance zone
                if (offset > 0) {
                    targetCameraX.current = characterPos.x - tolerance;
                } else {
                    targetCameraX.current = characterPos.x + tolerance;
                }
            }

            // Smoothly update camera position to follow on x-axis
            camera.position.x += (targetCameraX.current - camera.position.x) * 0.1;

            // Update OrbitControls target to match camera x position
            orbitRef.current.target.x = camera.position.x;
            orbitRef.current.target.y = 0;
            orbitRef.current.target.z = 0;
            orbitRef.current.update();
        }
    });

    return (
        <OrbitControls
            ref={orbitRef}
            target={[0, 0, 0]}
            enableRotate={false}
            enablePan={false}
            minDistance={3}
            maxDistance={15}
        />
    );
}