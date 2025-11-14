
import { useRef, forwardRef, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import { FollowCam } from "@/shared/cameras/FollowCam";
import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import Rapier from '@dimforge/rapier3d-compat';
import DialogCollider from "@/shared/ped/DialogCollider";
import CutsceneCamera from "@/shared/cameras/CutsceneCamera";

interface PlayerHandle {
    tap: () => void;
    getSpeed: () => number;
}

interface PlayerProps {
    groupRef?: React.RefObject<THREE.Group>;
}

const Chaser = forwardRef<PlayerHandle, PlayerProps>((props, ref) => {
    const [animation, setAnimation] = useState<string>('idle');


    return <RigidBody
        position={[0, 0, 8]}
        type="kinematicVelocity"
        activeCollisionTypes={
            Rapier.ActiveCollisionTypes.KINEMATIC_FIXED |
            Rapier.ActiveCollisionTypes.DYNAMIC_KINEMATIC |
            Rapier.ActiveCollisionTypes.KINEMATIC_KINEMATIC
        }
    >
        <AnimatedModel
            scale={1}
            basePath={"/models/human/onimilio/"}
            model={"rigged.glb"}
            animation={animation}
            animationOverrides={{
                idle: 'anim/idle.fbx',
                walk: 'anim/walk.fbx',
                run: 'anim/run.fbx',
                jump: 'anim/jump.fbx',
                walkLeft: "/anim/walkLeft.fbx",
                lpunch: "/anim/lpunch.fbx",
                rpunch: "/anim/rpunch.fbx",
            }}
        >
            <DialogCollider
                height={1.9}
                sceneChildren={<CutsceneCamera position={[-0.2, 2, -2]} rotation={[0.2, Math.PI, 0]} />}
            >
                hello there
            </DialogCollider>
        </AnimatedModel>
    </RigidBody>
})

export default Chaser;