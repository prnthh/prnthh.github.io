import RigidHumanoidModel from "@/shared/ped/physics/RigidHumanoidModel";
import { useRef, useState } from "react";
import WawaControls from "./WawaControls";
import { RigidHumanoidModelRef } from "@/shared/ped/physics/types";

export const CharacterController = () => {
    const modelRef = useRef<RigidHumanoidModelRef>(null);
    const [animation, setAnimation] = useState<"idle" | "walk" | "run">("idle");

    return (
        <>
            <RigidHumanoidModel
                ref={modelRef}
                basePath="/models/human/onimilio/"
                model="rigged.glb"
                animation={animation}
                height={0.9}
                animationOverrides={{
                    idle: 'anim/idle.fbx',
                    walk: 'anim/walk.fbx',
                    run: 'anim/run.fbx',
                }}
            >
                <WawaControls
                    modelRef={modelRef}
                    setAnimation={setAnimation}
                    walkSpeed={1}
                    runSpeed={2.2}
                    rotationSpeed={0.01}
                />
            </RigidHumanoidModel>
        </>
    );
};