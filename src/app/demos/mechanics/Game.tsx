"use client";

import { useEffect, useRef, useState } from "react";

import { Environment, Helper, useGLTF, useTexture } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { BackSide, DirectionalLightHelper, Mesh, NearestFilter, Object3D } from "three";
import { GameCanvas } from "react-three-game";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import { ThirdPersonController } from "@/app/react-three-controller/thirdperson/ThirdPersonController";

import CrawlerApp from "@/shared/ik/CrawlerPed";
import Balloon from "@/shared/physics/Balloon";
import { createWavingMaterial } from "@/shared/shaders/WavyMaterial";

import Ped from "@/app/react-three-controller/ped/ped";
import ModelAttachment from "@/app/react-three-controller/ped/ModelAttachment";
import DialogCollider from "@/app/react-three-controller/ped/physics/DialogCollider";
import FootballGame from "./FootballGame";


export default function Game({ onCanvasReady }: { onCanvasReady?: () => void }) {
    return <Controls>
        <GameCanvas>
            <Physics>
                <Lighting />
                <FogEnvironment />
                <InnerGame onCanvasReady={onCanvasReady} />
            </Physics>
            <ambientLight intensity={1} />

        </GameCanvas>
    </Controls >

}


const FogEnvironment = () => {
    const texture = useTexture('/textures/skybox1.jpg');
    // texture.minFilter = NearestFilter;
    // texture.magFilter = NearestFilter;
    return <>
        <fog attach="fog" args={['#87ceeb', 10, 50]} />
        <color attach={"background"} args={['#87ceeb']} />
        <Environment background>
            <mesh >
                <sphereGeometry args={[10, 64, 64]} />
                <meshBasicMaterial map={texture} side={BackSide} />
            </mesh>
        </Environment>
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

const InnerGame = ({ onCanvasReady }: { onCanvasReady?: () => void }) => {
    const ballRef = useRef<Object3D | null>(null);

    useEffect(() => {
        onCanvasReady?.();
    }, [onCanvasReady]);



    return <>

        <ThirdPersonController lookTarget={ballRef} >
            <ModelAttachment
                model="/models/environment/Katana.glb"
                attachpoint="mixamorigRightHand"
                offset={[0, 0, 0]}
                scale={[100, 100, 100]}
                rotation={[0, 0.8, -1.2]}
            />
        </ThirdPersonController>
        <PunchingBag position={[5, 2, 8]} />

        <group position={[-2, 0, 5]}>
            <CrawlerApp controlled={false} />
        </group>

        <WavyTree position={[-5, 0, 17]} />

        <FootballGame ref={ballRef} />
        <GoalFollowingPed ballRef={ballRef} />

    </>
}

const WavyTree = ({ position = [0, 0, 0] }: { position?: [number, number, number] }) => {
    const { scene } = useGLTF('/models/environment/tree.glb');
    const [clone, setClone] = useState<Object3D | undefined>(undefined);

    useEffect(() => {
        if (!scene) return;
        const clonedScene = scene.clone();
        clonedScene.traverse((child) => {
            if (child instanceof Mesh) {
                const originalMaterial = child.material;
                child.material = createWavingMaterial(originalMaterial);
            }
        });
        setClone(clonedScene);
    }, [scene]);

    if (!clone) return null;


    return <primitive position={position} object={clone} />;
}


const PunchingBag = ({ position = [0, 0, 0] }: { position?: [number, number, number] }) => {
    return <>
        <Balloon position={position}>
            <mesh castShadow receiveShadow >
                <capsuleGeometry args={[0.2, 0.8]} />
                <meshStandardMaterial color="red" />
            </mesh>
        </Balloon>
    </>
};



const GoalFollowingPed = ({ ballRef }: { ballRef: React.RefObject<Object3D | null> }) => {
    const [ballPosition, setBallPosition] = useState<[number, number, number]>([0, 2, 10]);
    const [dialogVisible, setDialogVisible] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            if (ballRef.current) {
                const pos = new Object3D();
                ballRef.current.getWorldPosition(pos.position);
                setBallPosition([pos.position.x, pos.position.y, pos.position.z]);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [ballRef]);

    return <Ped model="rigga/rigga2.glb" position={ballPosition} modelOffset={[0, -0.5, 0]} lookTarget={ballRef}>
        <DialogCollider>Ole!</DialogCollider>
    </Ped>
}

