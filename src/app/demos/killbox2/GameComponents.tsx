import { CombinedController, Ped } from "@/app/react-three-controller";
import { PedSpawner } from "../zoo/Game";
import { DemoGroup } from "./DemoGroup";
import ButtonBox from "../zoo/Button";
import Rain from "@/shared/rain";
import CrawlerApp from "@/shared/ik/CrawlerPed";
import { FirstPersonArms } from "@/app/react-three-controller/firstperson/FirstPersonArms";
import Breakable from "@/shared/Breakable";

export default function GameComponents() {
    return <>
        <CombinedController mode="first-person"
        // forwardRef={(refs) => {
        //     rigidBodyRef.current = refs.rigidBodyRef.current;
        //     bodyMeshRef.current = refs.meshref.current;
        //     cameraRigRef.current = refs.cameraRigRef.current;
        //     if (playerRef) playerRef.current = refs.meshref.current;
        // }}
        // onFire={handleFire}
        />

        <DemoGroup label="ped" position={[-5, 0, -6]} size={[3, 3]}>
            <Ped modelOffset={[0, 0.15, 0]} model="/models/human/onimilio/rigged.glb" />
        </DemoGroup>
        <DemoGroup label="ped" position={[0, 0, -6]} size={[3, 3]}>
            <Ped height={1.2} modelOffset={[0, -0.8, 0]} scale={2} model="/models/human/rigga/rigga2.glb" />
        </DemoGroup>
        <DemoGroup label="button" position={[5, 0, -6]} size={[3, 3]}>
            <ButtonBox position={[0, 1, 0]} onActivate={() => {
                console.log("Button activated!");
            }} />
        </DemoGroup>

        <DemoGroup label="pedspawner" position={[10, 0, -6]} size={[3, 3]}>
            <PedSpawner position={[0, 0, 0]} />
        </DemoGroup>

        <DemoGroup label="pedspawner" position={[15, 0, -6]} size={[3, 3]}>
            <CrawlerApp controlled={false} />
        </DemoGroup>

        <DemoGroup label="breakable" position={[20, 0, -6]} size={[3, 3]}>
            <Breakable type="dynamic" initialVelocity={false}>
                <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="hotpink" />
                </mesh>
            </Breakable>
        </DemoGroup>

        <Rain
            particleCount={10000}
            areaSize={[60, 60]}
            position={[0, 25, 0]}
            enableCollision={true}
            opacity={0.25}
            speedMultiplier={1.5}
        />
    </>;
}