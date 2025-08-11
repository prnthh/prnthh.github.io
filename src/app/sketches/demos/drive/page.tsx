"use client";

import { Physics } from "@react-three/rapier";
import { Environment } from "@react-three/drei";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "@/app/sketches/lighting/shadowmap/ShadowLight";
import { Suspense, useRef } from "react";
import { GameCanvas } from "@/shared/GameCanvas";
import Vehicle, { ObjectRef } from "../../car/simple/car/base";
import { EditorModes, SceneNode, Viewer } from "../../editor/scene/viewer/SceneViewer";
import PedSpawner from "./PedSpawner";
import drive from "./map";
import { GameEngine } from "../../editor/scene/editor/EditorContext";

export default function Home() {
    const carRBRef = useRef<ObjectRef | null>(null);
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>

                    <GameEngine mode={EditorModes.Play} sceneGraph={drive as unknown as SceneNode[]}>
                        <GameCanvas>
                            <Physics paused={false}>
                                <Vehicle
                                    ref={carRBRef}
                                    chassisModel="/models/cars/taxi/chassis.glb"
                                    wheelModel="/models/cars/taxi/wheel.glb"
                                />
                                {/* <Ground position={[0, -2, 0]} /> */}
                                {/* <Bvh firstHitOnly>
                                    <MapModel modelUrl="/models/maps/burnin_rubber_4_city.glb" position={[-572, -10, 710]} scale={0.4} />


                                </Bvh> */}
                                <Suspense fallback={null}>
                                    <PedSpawner carRBRef={carRBRef} />
                                </Suspense>
                                <ambientLight intensity={0.5} />
                                <ShadowLight />
                                <Viewer />

                                <ambientLight intensity={0.5} />
                                <Environment files="/textures/skybox3.jpg" background={true} />
                            </Physics>
                        </GameCanvas>
                    </GameEngine>

                </Controls>
            </div>
        </div >
    );
}

