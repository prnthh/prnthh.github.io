
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
    swipe: (type: 'left' | 'right') => void;
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
    const speedRef = useRef(0);
    const hasTapped = useRef(false);
    const isPaused = useRef(false);

    const MAX_SPEED = 5;

    useImperativeHandle(ref, () => ({
        tap: () => {
            hasTapped.current = true;
        },
        getSpeed: () => speedRef.current,
        swipe: (type: 'left' | 'right') => {
            // Stop the player
            speedRef.current = 0;
            isPaused.current = true;

            // Set punch animation
            const punchAnim = type === 'left' ? 'lpunch' : 'rpunch';
            animRef.current = punchAnim;
            setAnimation(punchAnim);

            // Reset to idle after animation duration (approx 0.5s)
            setTimeout(() => {
                isPaused.current = false;
                animRef.current = 'idle';
                setAnimation('idle');
            }, 500);
        }
    }), []);

    useImperativeHandle(groupRef, () => internalRef.current, []);

    useFrame((state, delta) => {
        // Early return if paused
        if (isPaused.current) return;

        // Process tap flag
        if (hasTapped.current) {
            speedRef.current = Math.min(speedRef.current + 0.5, MAX_SPEED);
            hasTapped.current = false;
        }

        if (!rigidBodyRef.current) return;

        // Decay speed over time
        speedRef.current = Math.min(Math.max(speedRef.current - delta, 0), MAX_SPEED);
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: speedRef.current }, true);

        const speed = speedRef.current;
        const next = animRef.current === 'idle' && speed > 0.3 ? 'walk'
            : animRef.current === 'walk' ? (speed < 0.1 ? 'idle' : speed > 3.2 ? 'run' : 'walk')
                : animRef.current === 'run' && speed < 3.0 ? 'walk'
                    : animRef.current;

        if (next !== animRef.current) {
            animRef.current = next;
            setAnimation(next);
        }
    }, -100); // Player movement runs early, before camera updates

    return <RigidBody
        name="bob"
        ref={rigidBodyRef}
        position={[0, 0, 2]}
        type="kinematicVelocity"
        activeCollisionTypes={
            Rapier.ActiveCollisionTypes.KINEMATIC_FIXED |
            Rapier.ActiveCollisionTypes.DYNAMIC_KINEMATIC |
            Rapier.ActiveCollisionTypes.KINEMATIC_KINEMATIC
        }
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