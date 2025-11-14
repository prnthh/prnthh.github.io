
import { useRef, forwardRef, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import { FollowCam } from "@/shared/cameras/FollowCam";
import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import Rapier from '@dimforge/rapier3d-compat';

interface PlayerHandle {
    tap: () => void;
    getSpeed: () => number;
}

interface PlayerProps {
    groupRef?: React.RefObject<THREE.Group>;
}

const Player = forwardRef<PlayerHandle, PlayerProps>((props, ref) => {
    const [animation, setAnimation] = useState<string>('idle');
    const { groupRef } = props;
    const rigidBodyRef = useRef<RapierRigidBody>(null!);
    const internalRef = useRef<THREE.Group>(null!);
    const animRef = useRef('idle');
    const velCache = useRef({ x: 0, y: 0, z: 0 });

    useImperativeHandle(ref, () => ({
        tap: () => {
            velCache.current.z += 0.5;
            rigidBodyRef.current.setLinvel(velCache.current, true);
        },
        getSpeed: () => velCache.current.z
    }), []);

    useImperativeHandle(groupRef, () => internalRef.current, []);

    useFrame((state, delta) => {
        const vel = rigidBodyRef.current.linvel();
        const clamped = Math.min(Math.max(vel.z - delta, 0), 5);

        velCache.current.z = clamped;
        rigidBodyRef.current.setLinvel(velCache.current, true);

        const next = animRef.current === 'idle' && clamped > 0.3 ? 'walk'
            : animRef.current === 'walk' ? (clamped < 0.1 ? 'idle' : clamped > 3.2 ? 'run' : 'walk')
                : animRef.current === 'run' && clamped < 3.0 ? 'walk'
                    : animRef.current;

        if (next !== animRef.current) {
            animRef.current = next;
            setAnimation(next);
        }
    });

    return <RigidBody
        name="bob"
        ref={rigidBodyRef}
        position={[0, 0, 5]}
        type="kinematicVelocity"
        activeCollisionTypes={Rapier.ActiveCollisionTypes.KINEMATIC_FIXED | Rapier.ActiveCollisionTypes.DYNAMIC_KINEMATIC}
    >
        <AnimatedModel
            ref={internalRef}
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
            <FollowCam height={1} cameraOffset={[0, 1, -2]} targetOffset={[0, 1.8, 0]} />
        </AnimatedModel>
    </RigidBody>
})

export default Player;