"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "@/app/sketches/lighting/shadowmap/ShadowLight";
import Ground from "../../floor/ground/ground/flat";
import Vehicle from "../simple/car/base";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <Canvas shadows>
                        <Physics>
                            <Vehicle
                                debug
                                chassisModel="/models/cars/taxi/chassis.glb"
                                wheelModel="/models/cars/taxi/wheel.glb"
                            />
                            <Ground position={[0, -2, 0]} />

                            <ambientLight intensity={0.5} />
                            <ShadowLight />
                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div >
    );
}
