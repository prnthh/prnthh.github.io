

import { useEffect, useState } from "react";

import { useGLTF, } from "@react-three/drei";
import Balloon from "@/shared/physics/Balloon";
import { createWavingMaterial } from "@/shared/shaders/WavyMaterial";
import { Mesh, Object3D } from "three";
import CrawlerApp from "@/shared/ik/CrawlerPed";
import Rain from "@/shared/rain";
import ButtonBox from "./Button";
import HitBox from "@/shared/physics/HitBox";
import { useTimeRNGNumber } from "@/shared/etc/TimeRNG";
import { Text } from 'three-text/three/react';

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
            <mesh castShadow receiveShadow>
                <capsuleGeometry args={[0.2, 0.8]} />
                <meshStandardMaterial color="red" />
            </mesh>
        </Balloon>
    </>
};

Text.setHarfBuzzPath('/fonts/hb.wasm');

const RandomNumberExample = () => {
    const randomNum = useTimeRNGNumber({ min: 0, max: 100 });
    const randomNum2 = useTimeRNGNumber({ min: 0, max: Math.PI * 2, seedOffset: 42 });

    const width = 5;

    return <>
        <group position={[-width / 2, 2, 0]}>
            <Text font="/fonts/NimbusSanL-Reg.woff" size={0.5} depth={0} layout={{ align: 'center', width: width }}>
                {`today's random numbers: ${randomNum.toFixed()} and ${randomNum2.toFixed()}`}
            </Text>
        </group>
    </>
}

export default function ExperimentalStuff() {
    return <>
        <PunchingBag position={[5, 2, 8]} />

        <group position={[0, 0, -15]}>
            <RandomNumberExample />

            <Balloon position={[-2, 1, 0]} />
            <HitBox debug key={2} position={[-1, 1, 0]} />
            <HitBox debug key={3} position={[0, 1, 0]} />
            <HitBox debug key={4} position={[1, 1, 0]} />
            <Balloon position={[2, 1, 0]} />
        </group>

        <WavyTree position={[-5, 0, 17]} />
        <WavyTree position={[5, 0, 17]} />

        <group position={[-2, 0, 5]}>
            <CrawlerApp controlled={false} />
        </group>

        <ButtonBox position={[0, 1, 0]} onActivate={() => {
            console.log("Button activated!");
        }} />

        <Rain
            particleCount={10000}
            areaSize={[60, 60]}
            position={[0, 25, 0]}
            enableCollision={true}
            opacity={0.25}
            speedMultiplier={1.5}
        />
    </>
}
