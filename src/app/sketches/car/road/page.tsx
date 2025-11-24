"use client";

import { useState } from "react";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { Road as TexturedRoad } from "./Road";
import { Car } from "./Car";
import Controls from "@/shared/controls/ControlsProvider";
import DemoWorld from "@/shared/debug/DemoWorld";
import GameCanvas from "@/shared/GameCanvas";
import SimpleModel from "@/shared/SimpleModel";

export default function Home() {
    const [roadData, setRoadData] = useState<{ points: any[], tangents: any[], normals: any[], binormals: any[] } | null>(null);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics>
                            <TexturedRoad onData={setRoadData} />
                            <DemoWorld />
                            {roadData && (
                                <>
                                    <Car {...roadData} speed={1}>
                                        <SimpleModel modelUrl="/models/cars/taxi/car.glb" position={[0, 0, 0]} />
                                    </Car>
                                    <Car {...roadData} speed={0.2}>
                                        <SimpleModel modelUrl="/models/cars/taxi/car.glb" position={[0, 0, 0]} />
                                    </Car>
                                </>
                            )}
                        </Physics>
                        <OrbitControls />
                    </GameCanvas>
                </Controls>
            </div>
        </div>
    );
}
