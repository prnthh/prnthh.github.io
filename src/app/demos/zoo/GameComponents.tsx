import { NeoController, ModelAttachment, Ped } from "@/app/react-three-controller";
import { DemoGroup } from "@/shared/util/DemoGroup";
import ButtonBox from "@/shared/util/Button";
import Rain from "@/shared/shaders/rain";
import CrawlerApp from "@/shared/ik/CrawlerPed";
import Breakable from "@/shared/Breakable";
import { useCallback, useEffect, useRef, useState } from "react";
// import { useControls } from "leva";
import DebugGround from "@/shared/ground/DebugGround";
import DialogCollider from "@/shared/physics/DialogCollider";
import FootballGame from "./FootballGame";
import { Mesh, Object3D } from "three";
import Balloon from "@/shared/physics/Balloon";
import HitBox from "@/shared/physics/HitBox";
import { useGLTF, } from "@react-three/drei";
import { createWavingMaterial } from "@/shared/shaders/WavyMaterial";

export default function GameComponents() {
    // const { mode } = useControls({
    //     mode: { value: 'wawa', options: ['click', 'wawa', 'tap', 'third-person', 'first-person'] }
    // });
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);
    const ballRef = useRef<Object3D | null>(null);

    return <>
        <NeoController />

        <group position={[30, 0, 0]}>
            <FootballGame ref={ballRef} />
            {<PedSpawner playerRef={ballRef} position={[2, 0, 10]} />}
            <GoalFollowingPed ballRef={ballRef} />

        </group>


        <DemoGroup label="ped" position={[-5, 0, 6]} size={[3, 3]}>
            <Ped modelOffset={[0, 0.15, 0]} model="/models/human/onimilio/rigged.glb" />
        </DemoGroup>
        <DemoGroup label="ped" position={[-5, 0, 12]} size={[3, 3]}>
            <Ped height={1.2} modelOffset={[0, -0.8, 0]} scale={2} model="/models/human/rigga/rigga2.glb" />
        </DemoGroup>
        <DemoGroup label="pedspawner" position={[-5, 0, 18]} size={[3, 3]}>
            <PedSpawner position={[0, 0, 0]} />
        </DemoGroup>
        <DemoGroup label="pedspawner" position={[-5, 0, 24]} size={[3, 3]}>
            <CrawlerApp controlled={false} />
        </DemoGroup>

        <DemoGroup label="button" position={[5, 0, 6]} size={[3, 3]}>
            <ButtonBox position={[0, 1, 0]}
                onActivate={() => { console.log("Button activated!"); }}
            />
        </DemoGroup>

        <DemoGroup label="breakable" position={[5, 0, 12]} size={[3, 3]}>
            <Breakable type="dynamic" initialVelocity={false}>
                <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="hotpink" />
                </mesh>
            </Breakable>
        </DemoGroup>

        <DemoGroup label="rain" position={[5, 0, 18]} size={[3, 3]}>
            <RainButton />
        </DemoGroup>

        <DemoGroup label="tree wave" position={[5, 0, 24]} size={[3, 3]}>
            <WavyTree />
        </DemoGroup>

        <DemoGroup label="punching bag" position={[5, 0, 30]} size={[3, 3]}>
            <PunchingBag position={[0, 2, 0]} />
        </DemoGroup>

        <DebugGround
        //  onClick={mode === 'click' ? (e) => { setTarget([e.point.x, e.point.y, e.point.z]) } : undefined}
        />
        <DialogCollider label="omg its prnth.com!" />

        {/* <RandomNumberExample /> */}

        <Balloon position={[-2, 1, 0]} />
        <HitBox debug key={2} position={[-1, 1, 0]} />
    </>;
}


export const PedSpawner = ({ position = [0, 0, 0], playerRef }: { position?: [number, number, number], playerRef?: React.RefObject<Object3D | null> }) => {
    const [peds, setPeds] = useState<{ id: number, position: [number, number, number], dead?: boolean }[]>([
        { id: 1, position: position }
    ]);
    const maxPeds = 10;
    const nextIdRef = useRef(2);

    const handlePedShot = useCallback((id: number) => {
        // Mark as dead
        setPeds(prev => prev.map(p => p.id === id ? { ...p, dead: true } : p));

        // Spawn a new ped if under max
        setPeds(prev => {
            if (prev.length < maxPeds) {
                return [...prev, {
                    id: nextIdRef.current++,
                    position: position
                }];
            }
            return prev;
        });

        // Remove the dead ped after 5 seconds
        setTimeout(() => {
            setPeds(prev => prev.filter(p => p.id !== id));
        }, 5000);
    }, [position]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef?.current) {
                const pos = new Object3D();
                playerRef.current.getWorldPosition(pos.position);
                setPeds(prevPeds =>
                    prevPeds.map(ped =>
                        ped.dead ? ped : {
                            ...ped,
                            position: [pos.position.x, pos.position.y, pos.position.z]
                        }
                    )
                );
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [playerRef]);

    return <>{peds.map(ped => <Ped
        key={ped.id}
        modelOffset={[0, -0.5, 0]}
        position={ped.position}
        model="/models/human/rigga/rigga2.glb"
        onBulletHit={() => handlePedShot(ped.id)}
    >
        {/* <DialogCollider radius={3} height={1.2}>Ah hello</DialogCollider> */}
        <ModelAttachment
            model="/models/environment/Katana.glb"
            attachpoint="mixamorigRightHand"
            offset={[2, 0, 0]}
            scale={[100, 100, 100]}
            rotation={[0.7, 0, -1]}
        />
    </Ped>)}</>
}

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

    return <Ped model="/models/human/rigga/rigga2.glb" position={ballPosition} modelOffset={[0, -0.5, 0]} lookTarget={ballRef}>
        <DialogCollider>Ole!</DialogCollider>
    </Ped>
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
            <mesh castShadow receiveShadow>
                <capsuleGeometry args={[0.2, 0.8]} />
                <meshStandardMaterial color="red" />
            </mesh>
        </Balloon>
    </>
};


const RainButton = () => {
    const [rainEnabled, setRainEnabled] = useState(false);

    return (
        <>
            <ButtonBox position={[0, 1, 0]} onActivate={() => setRainEnabled((prev) => !prev)} />

            {rainEnabled && <Rain
                particleCount={10000}
                areaSize={[60, 60]}
                position={[0, 25, 0]}
                enableCollision={true}
                opacity={0.25}
                speedMultiplier={1.5}
            />}
        </>
    );
}