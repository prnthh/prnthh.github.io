"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Environment, OrbitControls } from "@react-three/drei";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "@/app/sketches/lighting/shadowmap/ShadowLight";
import Ground from "../../floor/ground/ground/flat";
import Vehicle from "../simple/car/base";
import MapModel from "../../floor/ground/ground/model";

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
                            {/* <Ground position={[0, -2, 0]} /> */}
                            <MapModel modelUrl="/models/maps/burnin_rubber_4_city.glb" position={[-572, -10, 710]} scale={0.4} />

                            <ambientLight intensity={0.5} />
                            <ShadowLight />
                        </Physics>
                        <Environment backgroundBlurriness={0.05} preset="dawn" background={'only'} ground={{ height: 100, scale: 10000 }} />
                    </Canvas>
                </Controls>
            </div>
        </div >
    );
}
