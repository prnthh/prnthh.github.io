"use client";

import { Physics } from "@react-three/rapier";
import { Environment, Helper, useGLTF, } from "@react-three/drei";
import { DirectionalLightHelper, Object3D } from "three";
import CrawlerApp from "@/shared/ik/CrawlerPed";
import { Vector3 } from "three";
import { useEffect, useState } from "react";
import HitBox from "@/shared/physics/HitBox";
import Balloon from "@/shared/physics/Balloon";
import GameCanvas from "@/shared/GameCanvas";
import Controls, { useControlScheme } from "@/shared/controls/ControlsProvider";
import ModelAttachment from "@/shared/ped/ModelAttachment";
import DialogCollider from "@/shared/ped/physics/DialogCollider";
import Ped from "@/shared/ped/physics/ped";
import * as THREE from "three";
import { createWavingMaterial } from "@/shared/shaders/WavyMaterial";
import DemoWorld, { DemoEnvironment } from "@/shared/debug/DemoWorld";
import { ThirdPersonController } from "../../controllers/thirdperson/ThirdPersonController";

export default function Home() {

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameCanvas>
                        <Physics debug>

                            <ambientLight intensity={0} />
                            <DemoEnvironment />
                            <Game />
                            <Lighting />
                            <FogEnvironment />
                        </Physics>
                    </GameCanvas>
                </Controls>
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

const Game = () => {
    return <>
        <DemoWorld />
        <ThirdPersonController>
            <ModelAttachment
                model="/models/environment/Katana.glb"
                attachpoint="mixamorigRightHand"
                offset={[0, 0, 0]}
                scale={[100, 100, 100]}
                rotation={[0, 0.8, -1.2]}
            />
        </ThirdPersonController>
        <Ped unstable modelOffset={[0, -0.5, 0]} position={[3, 0, 3]} model="/rigga/rigga2.glb">
            <DialogCollider radius={3} height={1.2}>Ah hello</DialogCollider>
            <ModelAttachment
                model="/models/environment/Katana.glb"
                attachpoint="mixamorigRightHand"
                offset={[2, 0, 0]}
                scale={[100, 100, 100]}
                rotation={[0.7, 0, -1]}
            />
        </Ped>

        <HitBox debug key={2} position={[1, 1, 4]} />
        <HitBox debug key={3} position={[2, 1, 4]} />
        <HitBox debug key={4} position={[3, 1, 4]} />
        <Balloon position={[2, 3, 4]} />

        <PunchingBag position={[5, 2, 0]} />

        <group position={[-2, 0, 5]}>
            <CrawlerApp controlled={false} />
        </group>

        <WavyTree />
    </>
}

const WavyTree = () => {
    const { scene } = useGLTF('/models/environment/tree.glb');
    const [clone, setClone] = useState<Object3D | undefined>(undefined);

    useEffect(() => {
        if (!scene) return;
        const clonedScene = scene.clone();
        clonedScene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const originalMaterial = child.material;
                child.material = createWavingMaterial(originalMaterial);
            }
        });
        setClone(clonedScene);
    }, [scene]);

    if (!clone) return null;


    return <primitive position={[-5, 0, 4]} object={clone} />;
}


const PunchingBag = ({ position = [0, 0, 0] }: { position?: [number, number, number] }) => {
    return <>
        <Balloon position={[5, 2, 5]}>
            <mesh castShadow receiveShadow >
                <capsuleGeometry args={[0.2, 0.8]} />
                <meshStandardMaterial color="red" />
            </mesh>
        </Balloon>
    </>
};