import { CombinedController, Ped } from "@/app/react-three-controller";
import { PedSpawner } from "../museum/Game";
import { DemoGroup } from "@/shared/util/DemoGroup";
import ButtonBox from "@/shared/util/Button";
import Rain from "@/shared/shaders/rain";
import CrawlerApp from "@/shared/ik/CrawlerPed";
import Breakable from "@/shared/Breakable";
import { useState } from "react";
import { useControls } from "leva";
import DebugGround from "@/shared/ground/DebugGround";
import DialogCollider from "@/shared/physics/DialogCollider";

export default function GameComponents() {
    const { mode } = useControls({
        mode: { value: 'wawa', options: ['click', 'wawa', 'tap', 'third-person', 'first-person'] }
    });
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);

    return <>
        <CombinedController mode={mode} target={target} />


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
            <ButtonBox position={[0, 1, 0]} onActivate={() => {
                console.log("Button activated!");
            }} />
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
        <DebugGround onClick={mode === 'click' ? (e) => { setTarget([e.point.x, e.point.y, e.point.z]) } : undefined} />

        <DialogCollider label="omg its prnth.com!" />

    </>;
}

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