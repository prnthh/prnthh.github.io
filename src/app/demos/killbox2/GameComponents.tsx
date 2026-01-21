import { FirstPersonController, Ped } from "@/app/react-three-controller";
import { PedSpawner } from "../mechanics/Game";
import { DemoGroup } from "./DemoGroup";
import ButtonBox from "../mechanics/Button";

export default function GameComponents() {
    return <>
        <FirstPersonController
        // forwardRef={(refs) => {
        //     rigidBodyRef.current = refs.rigidBodyRef.current;
        //     bodyMeshRef.current = refs.meshref.current;
        //     cameraRigRef.current = refs.cameraRigRef.current;
        //     if (playerRef) playerRef.current = refs.meshref.current;
        // }}
        // onFire={handleFire}
        />

        <DemoGroup label="ped" position={[-5, 0, -6]} size={[3, 3]}>
            <Ped modelOffset={[0, 0.15, 0]} model="onimilio/rigged.glb" />
        </DemoGroup>
        <DemoGroup label="ped" position={[0, 0, -6]} size={[3, 3]}>
            <Ped height={1.2} modelOffset={[0, -0.8, 0]} scale={2} model="rigga/rigga2.glb" />
        </DemoGroup>
        <DemoGroup label="button" position={[5, 0, -6]} size={[3, 3]}>
            <ButtonBox position={[0, 1, 0]} onActivate={() => {
                console.log("Button activated!");
            }} />
        </DemoGroup>

        <DemoGroup label="pedspawner" position={[10, 0, -6]} size={[3, 3]}>
            <PedSpawner position={[0, 0, 0]} />
        </DemoGroup>
    </>;
}