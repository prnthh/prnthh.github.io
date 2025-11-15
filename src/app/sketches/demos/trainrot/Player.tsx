
import { useRef, forwardRef, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, useBeforePhysicsStep } from "@react-three/rapier";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import { FollowCam } from "@/shared/cameras/FollowCam";
import { useInputStore } from "@/shared/providers/InputStore";
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
    const velocityRef = useRef(0);
    const stateRef = useRef({
        isPaused: false,
        lastSwipeTimestamp: 0,
        lastTapSignal: 0
    });

    const MAX_SPEED = 5;
    const ACCELERATION = 1;
    const DECAY = 0.02;

    useImperativeHandle(ref, () => ({
        tap: () => {
            useInputStore.getState().tap();
        },
        getSpeed: () => {
            return velocityRef.current;
        },
        swipe: (type: 'left' | 'right') => {
            useInputStore.getState().swipe(type);
        }
    }), []);

    useImperativeHandle(groupRef, () => internalRef.current, []);

    useFrame((state, delta) => {
        const { tapSignal, swipeSignal } = useInputStore.getState();

        if (swipeSignal && swipeSignal.timestamp !== stateRef.current.lastSwipeTimestamp) {
            stateRef.current.lastSwipeTimestamp = swipeSignal.timestamp;
            stateRef.current.isPaused = true;
            const punchAnim = swipeSignal.type === 'left' ? 'lpunch' : 'rpunch';
            setAnimation(punchAnim);
            setTimeout(() => {
                stateRef.current.isPaused = false;
                setAnimation('idle');
            }, 500);
        }

        if (stateRef.current.isPaused) return;

        if (tapSignal !== stateRef.current.lastTapSignal) {
            stateRef.current.lastTapSignal = tapSignal;
            velocityRef.current = Math.min(velocityRef.current + ACCELERATION, MAX_SPEED);
        }

        velocityRef.current -= DECAY * delta * 60;
        if (velocityRef.current < 0.01) velocityRef.current = 0;

        const speed = velocityRef.current;
        const next = animation === 'idle' && speed > 0.1 ? 'walk'
            : animation === 'walk' ? (speed < 0.1 ? 'idle' : speed > 3.0 ? 'run' : 'walk')
                : animation === 'run' && speed < 2.0 ? 'walk'
                    : animation;

        if (next !== animation) {
            setAnimation(next);
        }
    }, -100);

    useBeforePhysicsStep(() => {
        if (!rigidBodyRef.current) return;
        // round to avoid floating point issues and rapier jitters
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: parseFloat(velocityRef.current.toFixed(1)) }, true);
    });

    return <RigidBody
        name="bob"
        ref={rigidBodyRef}
        position={[0, 0, 2]}
        type="kinematicVelocity"
        enabledTranslations={[false, false, true]}
        activeCollisionTypes={
            Rapier.ActiveCollisionTypes.KINEMATIC_FIXED |
            Rapier.ActiveCollisionTypes.DYNAMIC_KINEMATIC |
            Rapier.ActiveCollisionTypes.KINEMATIC_KINEMATIC
        }
        lockRotations
    >
        <AnimatedModel
            ref={internalRef}
            scale={1}
            basePath="/models/human/onimilio/"
            model="rigged.glb"
            animation={animation}
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
            <FollowCam height={1} cameraOffset={[0, 1, -2]} targetOffset={[0, 1.8, 0]} />
        </AnimatedModel>
    </RigidBody>
})

export default Player;