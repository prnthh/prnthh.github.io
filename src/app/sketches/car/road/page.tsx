"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import Controls from "@/shared/ControlsProvider";
import { Road } from "./Road";
import { Road as RainbowRoad } from "./RainbowRoad";
import { Suspense } from "react";

function Fallback() {
    return (
        <mesh>
            <boxGeometry />
            <meshBasicMaterial color="hotpink" wireframe />
        </mesh>
    );
}

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <Canvas
                        shadows
                        gl={{ antialias: true }}
                        camera={{
                            fov: 65,
                            near: 0.01,
                            far: 200,
                            position: [0, 8, 16],
                        }}
                        onCreated={({ gl }) => {
                            gl.setClearColor(0x0fbd25, 1);
                        }}
                    >
                        <Physics>
                            <Suspense fallback={<Fallback />}>
                                <Road />

                                <group position={[0, 10, 0]}>
                                    <RainbowRoad />
                                </group>

                            </Suspense>
                            <ambientLight intensity={1.0} />
                        </Physics>
                        <OrbitControls />
                    </Canvas>
                </Controls>
            </div>
        </div>
    );
}
