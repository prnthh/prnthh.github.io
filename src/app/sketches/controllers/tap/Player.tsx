
import { useRef, forwardRef, useImperativeHandle, useState } from "react";
import RigidHumanoidModel from "@/shared/ped/physics/RigidHumanoidModel";
import { RigidHumanoidModelRef } from "@/shared/ped/physics/types";
import FollowCam from "@/shared/cameras/FollowCam";
import ModelAttachment from "@/shared/ped/ModelAttachment";
import TapControls from "./TapControls";
import { Group } from "three";

interface PlayerHandle {
    tap: () => void;
    getSpeed: () => number;
    swipe: (type: 'left' | 'right') => void;
}

interface PlayerProps {
    groupRef?: React.RefObject<Group>;
}

const Player = forwardRef<PlayerHandle, PlayerProps>((props, ref) => {
    const [animation, setAnimation] = useState<string>('idle');
    const { groupRef } = props;
    const modelRef = useRef<RigidHumanoidModelRef>(null!);

    useImperativeHandle(ref, () => ({
        tap: () => {
            // TapControls handles this internally
        },
        getSpeed: () => {
            return 0; // Could expose this from TapControls if needed
        },
        swipe: (type: 'left' | 'right') => {
            // TapControls handles this internally
        }
    }), []);

    useImperativeHandle(groupRef, () => modelRef.current?.groupRef.current, []);

    return <RigidHumanoidModel
        ref={modelRef}
        name="bob"
        position={[0, 0, 2]}
        basePath="/models/human/onimilio/"
        model="rigged.glb"
        animation={animation}
        height={0.9}
        animationOverrides={{
            idle: 'anim/idle.fbx',
            walk: 'anim/walk.fbx',
            run: 'anim/run.fbx',
            jump: 'anim/jump.fbx',
            walkLeft: 'anim/walkLeft.fbx',
            lpunch: 'anim/lpunch.fbx',
            rpunch: 'anim/rpunch.fbx',
        }}
    >
        <TapControls
            modelRef={modelRef}
            setAnimation={setAnimation}
        />
        <FollowCam height={1} cameraOffset={[0, 1, -2]} targetOffset={[0, 1.8, 0]} />
        <ModelAttachment
            model="/models/environment/Katana.glb"
            attachpoint="mixamorigRightHand"
            offset={[2, 0, 0]}
            scale={[100, 100, 100]}
            rotation={[0.7, 0, -1]}
        />
    </RigidHumanoidModel>
})

export default Player;