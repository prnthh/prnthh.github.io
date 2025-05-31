"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { Environment, OrbitControls, Sky } from "@react-three/drei";
import Vehicle from "./car/base";
import Controls from "@/shared/ControlsProvider";
import Lightsource from "@/app/sketches/lighting/simple/lightsource";
import Ground from "@/app/sketches/floor/ground/ground/flat";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <Canvas>
                        <Physics>
                            <Lightsource model="/models/environment/lamppost2.glb" rotation={[0, Math.PI, 0]} position={[-3, -2, -4]} />
                            <Lightsource model="/models/environment/lamppost2.glb" rotation={[0, Math.PI, 0]} position={[0, -2, -4]} />
                            <Lightsource model="/models/environment/lamppost2.glb" rotation={[0, Math.PI, 0]} position={[3, -2, -4]} />

                            <Vehicle />
                            <Ground position={[0, -2, 0]} />


                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />
                            <OrbitControls />
                            <Environment background={false} environmentIntensity={0.2} preset={'city'} />
                            <Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} />

                        </Physics>
                    </Canvas>
                </Controls>
            </div>
        </div>
    );
}
