"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Bvh, Environment, OrbitControls } from "@react-three/drei";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "@/app/sketches/lighting/shadowmap/ShadowLight";
import MapModel from "../../floor/ground/ground/model";
import { Suspense, useRef } from "react";
import PedSpawner from "./PedSpawner";
import { EffectComposer, SSAO } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { GameCanvas } from "@/shared/GameCanvas";
import { Perf } from "r3f-perf";
import Vehicle, { ObjectRef } from "../../car/simple/car/base";

export default function Home() {
    const carRBRef = useRef<ObjectRef | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics>
                            <Vehicle
                                ref={carRBRef}
                                chassisModel="/models/cars/taxi/chassis.glb"
                                wheelModel="/models/cars/taxi/wheel.glb"
                            />
                            {/* <Ground position={[0, -2, 0]} /> */}
                            <Bvh firstHitOnly>
                                <MapModel modelUrl="/models/maps/burnin_rubber_4_city.glb" position={[-572, -10, 710]} scale={0.4} />

                                <Suspense fallback={null}>
                                    <PedSpawner carRBRef={carRBRef} />
                                </Suspense>
                            </Bvh>

                            <ambientLight intensity={0.5} />
                            <ShadowLight />
                        </Physics>
                        <Environment backgroundBlurriness={0.05} preset="dawn" background={'only'} ground={{ height: 100, scale: 10000 }} />

                        {/* <EffectComposer enableNormalPass>
                            <SSAO
                                blendFunction={BlendFunction.MULTIPLY} // blend mode
                                samples={30} // amount of samples per pixel (shouldn't be a multiple of the ring count)
                                rings={4} // amount of rings in the occlusion sampling pattern
                                distanceThreshold={1.0} // global distance threshold at which the occlusion effect starts to fade out. min: 0, max: 1
                                distanceFalloff={0.0} // distance falloff. min: 0, max: 1
                                rangeThreshold={0.5} // local occlusion range threshold at which the occlusion starts to fade out. min: 0, max: 1
                                rangeFalloff={0.1} // occlusion range falloff. min: 0, max: 1
                                luminanceInfluence={0.9} // how much the luminance of the scene influences the ambient occlusion
                                radius={20} // occlusion sampling radius
                                // scale={0.5} // scale of the ambient occlusion
                                bias={0.5} // occlusion bias
                            />
                        </EffectComposer> */}


                    </GameCanvas>
                </Controls>
            </div>
        </div >
    );
}

