"use client";

import { Physics } from "@react-three/rapier";
import { Environment } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import Vehicle, { ObjectRef } from "../../car/simple/car/base";
import { EditorModes, SceneNode, Viewer } from "../../editor/scene/viewer/SceneViewer";
import PedSpawner from "./PedSpawner";
import drive from "./map";
import { GameEngine } from "../../editor/scene/editor/EditorContext";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
import DrivableCar from "../../car/simple/DrivableCar";
import { CharacterController } from "@/shared/shouldercam/CharacterController";

export default function Home() {
    const carRBRef = useRef<ObjectRef | null>(null);
    const [spawnPosition, setSpawnPosition] = useState<[number, number, number] | undefined>([0, -5, 0]);

    const setPlayerState = (carName: string | undefined) => {
        if (carName) {
            setSpawnPosition(undefined);
            // const carNode = drive.children.find(c => c.name === carName);
            // if (carNode) {
            //     setSpawnPosition([carNode.position[0], carNode.position[1] + 2, carNode.position[2]]);
            // }
        } else {
            setSpawnPosition([0, -5, 0]);
        }
    };

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>

                    <GameEngine mode={EditorModes.Play} sceneGraph={drive as unknown as SceneNode[]}>
                        <GameCanvas>
                            <Physics paused={false}>
                                {spawnPosition !== undefined && <CharacterController position={spawnPosition} />}

                                <DrivableCar name={'car1'} position={[-2, -6, 4]} setPlayerState={setPlayerState} />
                                <DrivableCar name={'car2'} position={[2, -6, 4]} setPlayerState={setPlayerState} />

                                <Suspense fallback={null}>
                                    <PedSpawner carRBRef={carRBRef} />
                                </Suspense>
                                <ambientLight intensity={0.5} />
                                <ShadowLight />
                                <Viewer />

                                <ambientLight intensity={0.5} />
                                <Environment preset="park" background={true} />
                            </Physics>
                        </GameCanvas>
                    </GameEngine>

                </Controls>
            </div>
        </div >
    );
}

