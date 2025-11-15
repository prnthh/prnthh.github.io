
import { useRef, forwardRef, useImperativeHandle, useState } from "react";
import * as THREE from "three";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import { FollowCam } from "@/shared/cameras/FollowCam";
import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import Rapier from '@dimforge/rapier3d-compat';
import { useInputStore } from "@/shared/firstperson/useInputStore";

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
    const stateRef = useRef({
        isPaused: false,
        lastSwipeTimestamp: 0,
        lastTapSignal: 0
    });

    const MAX_SPEED = 5;

    const applyImpulse = () => {
        if (!rigidBodyRef.current) return;
        const currentVel = rigidBodyRef.current.linvel();
        if (currentVel.z < MAX_SPEED) {
            rigidBodyRef.current.applyImpulse({ x: 0, y: 0, z: 0.5 }, true);
        }
    };

    useImperativeHandle(ref, () => ({
        tap: () => {
            useInputStore.getState().tap();
        },
        getSpeed: () => {
            if (!rigidBodyRef.current) return 0;
            return rigidBodyRef.current.linvel().z;
        },
        swipe: (type: 'left' | 'right') => {
            useInputStore.getState().swipe(type);
        }
    }), []);

    useImperativeHandle(groupRef, () => internalRef.current, []);

    useFrame((state, delta) => {
        // Read signals directly from store (no React re-render)
        const { tapSignal, swipeSignal } = useInputStore.getState();

        // Handle swipe
        if (swipeSignal && swipeSignal.timestamp !== stateRef.current.lastSwipeTimestamp) {
            stateRef.current.lastSwipeTimestamp = swipeSignal.timestamp;
            stateRef.current.isPaused = true;

            // Set punch animation
            const punchAnim = swipeSignal.type === 'left' ? 'lpunch' : 'rpunch';
            setAnimation(punchAnim);

            // Reset to idle after animation duration (approx 0.5s)
            setTimeout(() => {
                stateRef.current.isPaused = false;
                setAnimation('idle');
            }, 500);
        }

        // Early return if paused
        if (stateRef.current.isPaused) return;

        if (!rigidBodyRef.current) return;

        // Handle tap - apply impulse only when tapped
        if (tapSignal !== stateRef.current.lastTapSignal) {
            stateRef.current.lastTapSignal = tapSignal;
            applyImpulse();
        }

        // Get speed from rigidbody and update animation
        const speed = rigidBodyRef.current.linvel().z;
        const next = animation === 'idle' && speed > 0.3 ? 'walk'
            : animation === 'walk' ? (speed < 0.1 ? 'idle' : speed > 3.2 ? 'run' : 'walk')
                : animation === 'run' && speed < 3.0 ? 'walk'
                    : animation;

        if (next !== animation) {
            setAnimation(next);
        }
    }, -100); // Player movement runs early, before camera updates

    return <RigidBody
        name="bob"
        ref={rigidBodyRef}
        position={[0, 0, 2]}
        type="dynamic"
        linearDamping={0.5}
        enabledTranslations={[false, false, true]}
        lockRotations
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