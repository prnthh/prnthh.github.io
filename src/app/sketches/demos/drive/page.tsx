"use client";

import { Physics } from "@react-three/rapier";
import { useState } from "react";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import DrivableCar from "../../car/simple/DrivableCar";
import DemoWorld, { DemoWorldEnvironment } from "@/shared/DemoWorld";
import { ThirdPersonController } from "../../controllers/thirdperson/ThirdPersonController";

export default function Home() {
    const [spawnPosition, setSpawnPosition] = useState<[number, number, number] | undefined>([0, 2, 0]);

    const setPlayerState = (carName: string | undefined) => {
        if (carName) {
            setSpawnPosition(undefined);
        } else {
            setSpawnPosition([0, 2, 0]);
        }
    };

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>

                    <GameCanvas>
                        <Physics paused={false}>
                            {spawnPosition !== undefined && <ThirdPersonController position={spawnPosition} />}

                            {/* <DrivableCar name={'car1'} position={[-2, -6, 4]} setPlayerState={setPlayerState} />
                            <DrivableCar name={'car2'} position={[2, -6, 4]} setPlayerState={setPlayerState} /> */}
                            <DemoWorld />
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

