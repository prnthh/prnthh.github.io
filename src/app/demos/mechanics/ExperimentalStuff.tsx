

import { useEffect, useState } from "react";

import { useGLTF, } from "@react-three/drei";
import Balloon from "@/shared/physics/Balloon";
import { createWavingMaterial } from "@/shared/shaders/WavyMaterial";
import { Mesh, Object3D } from "three";
import CrawlerApp from "@/shared/ik/CrawlerPed";
import Rain from "@/shared/rain";

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
            <mesh castShadow receiveShadow layers={1}>
                <capsuleGeometry args={[0.2, 0.8]} />
                <meshStandardMaterial color="red" />
            </mesh>
        </Balloon>
    </>
};

export default function ExperimentalStuff() {
    return <>
        <PunchingBag position={[5, 2, 8]} />

        <WavyTree position={[-5, 0, 17]} />
        <WavyTree position={[5, 0, 17]} />

        <group position={[-2, 0, 5]}>
            <CrawlerApp controlled={false} />
        </group>

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
