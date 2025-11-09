"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import GameCanvas from "@/shared/GameCanvas";
import DebugGround from "@/shared/debug/DebugGround";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics>
                        <RigidBody>
                            <mesh castShadow>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial color="orange" />
                            </mesh>
                        </RigidBody>
                        <DebugGround />
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
                        <OrbitControls />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}
