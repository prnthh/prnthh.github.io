"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import DebugConsole from "./engine/debug/debugConsole";
import useGameStore from "./engine/gameStore";
import Entity from "./engine/BaseEntity";

export default function Home() {
    const gameObjects = useGameStore((state) => state.gameObjects);
    const setEntityRefs = useGameStore((state) => state.setEntityRefs);

    // Callback to store refs in the game store
    const handleRefsAvailable = (id: string, refs: any) => {
        setEntityRefs(id, refs);
    };

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh", position: "relative" }}>
                <DebugConsole />
                <Canvas>
                    <Physics>
                        {Object.entries(gameObjects).map(([name, object]) => (
                            <Entity
                                key={name}
                                gameObject={object}
                                onRefsAvailable={handleRefsAvailable}
                            />
                        ))}
                        <RigidBody type="fixed">
                            <mesh position={[0, -2, 0]} scale={[10, 0.1, 10]}>
                                <boxGeometry />
                                <meshStandardMaterial color="gray" />
                            </mesh>
                        </RigidBody>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} />
                        <OrbitControls />
                    </Physics>
                </Canvas>
            </div>
        </div>
    );
}
