"use client";

import { Physics } from "@react-three/rapier";
import { Environment } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import Vehicle, { ObjectRef } from "../../car/simple/car/base";
import drive from "./map";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import DrivableCar from "../../car/simple/DrivableCar";
import { CharacterController } from "@/shared/shouldercam/CharacterController";
import { DemoWorldEnvironment } from "@/shared/DemoWorld";

export default function Home() {
    const [spawnPosition, setSpawnPosition] = useState<[number, number, number] | undefined>([0, -5, 0]);

    const setPlayerState = (carName: string | undefined) => {
        if (carName) {
            setSpawnPosition(undefined);
        } else {
            setSpawnPosition([0, -5, 0]);
        }
    };

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>

                    <GameCanvas>
                        <Physics paused={false}>
                            {spawnPosition !== undefined && <CharacterController position={spawnPosition} />}

                            <DrivableCar name={'car1'} position={[-2, -6, 4]} setPlayerState={setPlayerState} />
                            <DrivableCar name={'car2'} position={[2, -6, 4]} setPlayerState={setPlayerState} />

                            <ambientLight intensity={0.5} />
                            <ShadowLight />

                            <ambientLight intensity={0.5} />
                            <DemoWorldEnvironment />
                        </Physics>
                    </GameCanvas>

                </Controls>
            </div>
        </div >
    );
}

