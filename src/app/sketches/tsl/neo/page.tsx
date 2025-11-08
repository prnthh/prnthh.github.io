"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import { Environment, Helper, Html, OrbitControls, Text } from "@react-three/drei";
import { GameEngine } from "../../editor/scene/editor/EditorContext";
import { EditorModes, SceneNode, Viewer } from "../../editor/scene/viewer/SceneViewer";
import drive from "../../demos/sidescroller/map";
import { DirectionalLightHelper } from "three";
import CrawlerApp from "@/shared/ik/CrawlerPed";
import { Vector3 } from "three";
import { useState } from "react";
import HitBox from "@/shared/physics/HitBox";
import Balloon from "@/shared/physics/Balloon";
import GameCanvas from "@/shared/GameCanvas";
import Controls, { useControlScheme } from "@/shared/controls/ControlsProvider";
import ModelAttachment from "@/shared/ped/ModelAttachment";
import DialogCollider from "@/shared/ped/DialogCollider";
import Ped from "@/shared/ped/ped";
import { CharacterController } from "@/shared/shouldercam/CharacterController";

export default function Home() {
    const [weapon, setWeapon] = useState<string | null>(null);

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameEngine mode={EditorModes.Play} sceneGraph={drive as unknown as SceneNode[]}>
                        <GameCanvas>
                            <Physics debug>

                                <ambientLight intensity={0} />
                                <Environment preset="park" background={false} />
                                <Game weapon={weapon} setWeapon={setWeapon} />
                                <Lighting />
                                <FogEnvironment />
                            </Physics>
                        </GameCanvas>
                    </GameEngine>
                </Controls>
            </div>
            <div className="absolute bottom-4 right-4">
                <button className="ml-2 p-2 rounded" onClick={() => setWeapon(weapon ? null : 'katana')}>Toggle Weapon</button>

            </div>
            <div className="absolute top-1/2 left-1/2 -translate-1/2">
                +
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

const Game = (props: { weapon: string | null; setWeapon: (weapon: string | null) => void }) => {
    const { scheme } = useControlScheme();
    return <>
        <CrawlerApp />

        <CharacterController mode={scheme == 'simple' ? 'side-scroll' : 'third-person'}>
            {props.weapon && <ModelAttachment
                model="/models/environment/Katana.glb"
                attachpoint="mixamorigRightHand"
                offset={new Vector3(0, 0, 0)}
                scale={new Vector3(100, 100, 100)}
                rotation={new Vector3(0, 0.8, -1.2)}
            />}
        </CharacterController>
        <Ped unstable modelOffset={[0, -0.5, 0]} position={[3, 0, 1]} modelUrl="/rigga/rigga2.glb">
            <DialogCollider radius={3} height={1.2}>Ah hello</DialogCollider>
            <ModelAttachment
                model="/models/environment/Katana.glb"
                attachpoint="mixamorigRightHand"
                offset={new Vector3(2, 0, 0)}
                scale={new Vector3(100, 100, 100)}
                rotation={new Vector3(0.7, 0, -1)}
            />
        </Ped>
        <Viewer />

        <HitBox debug key={2} position={[1, 1, 4]} />
        <HitBox debug key={3} position={[2, 1, 4]} />
        <HitBox debug key={4} position={[3, 1, 4]} />
        <Balloon />
    </>
}