"use client";

import { OrbitControls } from "@react-three/drei";
import Smoke from "./ParticleEmitter";
import { Vector3 } from "three";
import { useRef } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { GameCanvas } from "react-three-game";
import Particles from "./TSLParticle";
import Building from "./building/building";
import DemoWorld from "@/shared/debug/DemoWorld";

function Circular({
    radius = 5,
    speed = 0.01,
    y = 1,
    children,
}: {
    radius?: number;
    speed?: number;
    y?: number;
    children: (pos: Vector3) => ReactNode;
}) {
    const angleRef = useRef(0);
    const circularPos = useRef(new Vector3(radius, y, 0));
    useFrame(() => {
        angleRef.current += speed;
        circularPos.current.set(
            radius * Math.cos(angleRef.current),
            y,
            radius * Math.sin(angleRef.current)
        );
    });
    return <>{children(circularPos.current.clone())}</>;
}

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Building />
                    <Circular radius={5} speed={0.01} y={1}>
                        {(pos) => (
                            <Smoke
                                particle="/textures/water/water1.png"
                                debug
                                count={50}
                                size={1}
                                scaleFactor={0.8}
                                range={0.2}
                                emitterPosition={pos}
                            />
                        )}
                    </Circular>

                    <Particles />

                    <DemoWorld />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <OrbitControls />
                </GameCanvas>
            </div>
        </div>
    );
}
