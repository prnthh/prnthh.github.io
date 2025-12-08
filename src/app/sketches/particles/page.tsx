"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls, Sky } from "@react-three/drei";
import Smoke from "./ParticleEmitter";
import { Vector3 } from "three";
import { useRef, useState, ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import GameCanvas from "@/shared/GameCanvas";
import Particles from "./TSLParticle";
import Building from "./building/building";
import DebugGround from "@/shared/ground/DebugGround";
import DemoWorld, { DemoEnvironment } from "@/shared/debug/DemoWorld";

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
    const [angle, setAngle] = useState(0);
    const circularPos = useRef(new Vector3(radius, y, 0));
    useFrame(() => {
        setAngle((prev) => {
            const next = prev + speed;
            circularPos.current.set(
                radius * Math.cos(next),
                y,
                radius * Math.sin(next)
            );
            return next;
        });
    });
    return <>{children(circularPos.current.clone())}</>;
}

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics>
                        <Building />
                        <Circular radius={5} speed={0.01} y={1}>
                            {(pos) => (
                                <Smoke
                                    particle="/textures/water1.png"
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
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}
