"use client";

import { Physics } from "@react-three/rapier";
import { Environment, Helper, OrbitControls } from "@react-three/drei";
import GameCanvas from "./GameCanvas";
import { CharacterController } from "../../controllers/shouldercam/CharacterController";
import Controls, { useControlScheme } from "@/shared/ControlsProvider";
import Ped from "../../controllers/click/ped/ped";
import { GameEngine } from "../../editor/scene/editor/EditorContext";
import { EditorModes, SceneNode, Viewer } from "../../editor/scene/viewer/SceneViewer";
import drive from "../../demos/sidescroller/map";
import { DirectionalLightHelper } from "three";
import DialogCollider from "../../controllers/click/ped/DialogCollider";
import { CustomTSLThing } from "../tiny/CustomTSLThing";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameEngine mode={EditorModes.Play} sceneGraph={drive as unknown as SceneNode[]}>
                        <GameCanvas>
                            <Physics>

                                <ambientLight intensity={0} />
                                <Environment preset="park" background={false} />
                                <Game />
                                <Lighting />
                                <CustomTSLThing />
                                <FogEnvironment />
                            </Physics>
                        </GameCanvas>
                    </GameEngine>
                </Controls>
            </div>
        </div>
    );
}
const FogEnvironment = () => {
    return <>
        <fog attach="fog" args={['#87ceeb', 10, 50]} />
        <color attach={"background"} args={['#87ceeb']} />
    </>
}

const Lighting = ({ debug }: { debug?: boolean }) => {
    return <directionalLight
        position={[5, 10, 5]}
        intensity={2}
        castShadow
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={15}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
    >
        {debug && <Helper type={DirectionalLightHelper} />}
    </directionalLight>
}

const Game = () => {
    const { scheme } = useControlScheme();
    return <>
        <CharacterController mode={scheme == 'simple' ? 'side-scroll' : 'third-person'} />
        <Ped modelOffset={[0, -0.5, 0]} position={[3, 0, 1]} modelUrl="/rigga/rigga2.glb">
            <DialogCollider radius={3} height={1.2}>Ah hello</DialogCollider>
        </Ped>
        <Viewer />

    </>
}