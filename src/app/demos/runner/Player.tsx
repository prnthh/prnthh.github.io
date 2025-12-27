
import { useRef, forwardRef, useImperativeHandle, useState, useEffect, Suspense } from "react";
import { Group } from "three";
import { useFrame } from "@react-three/fiber";
import useInputStore from "@/app/react-three-controller/controls/InputStore";
import { Box, Capsule } from "@react-three/drei";
import AnimatedModel from "@/app/react-three-controller/ped/HumanoidModel";
import FollowCam from "@/shared/cameras/FollowCam";

interface PlayerHandle {
    tap: () => void;
    getSpeed: () => number;
    swipe: (type: 'left' | 'right') => void;
}

interface PlayerProps {
    groupRef?: React.RefObject<Group>;
}

const Player = forwardRef<PlayerHandle, PlayerProps>((props, ref) => {
    const [animation, setAnimation] = useState<string>('run');
    const { groupRef } = props;
    const containerRef = useRef<Group>(null!);

    const velocityRef = useRef(3); // Start with base running speed
    const progressRef = useRef(0); // Progress along the spline (0 to 1)
    const stateRef = useRef({
        isPaused: false,
        lastSwipeTimestamp: 0,
        lastTapSignal: 0
    });

    const BASE_SPEED = 3;
    const MAX_SPEED = 6;
    const ACCELERATION = 1.5;
    const DECAY = 0.03;

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

    // Forward the containerRef to groupRef after mount to avoid blocking Suspense
    useEffect(() => {
        if (groupRef && containerRef.current) {
            (groupRef as React.MutableRefObject<Group>).current = containerRef.current;
        }
    }, [groupRef]);

    useFrame((state, delta) => {
        const { tapSignal, swipeSignal } = useInputStore.getState();

        // Handle swipe for punch animations
        if (swipeSignal && swipeSignal.timestamp !== stateRef.current.lastSwipeTimestamp) {
            stateRef.current.lastSwipeTimestamp = swipeSignal.timestamp;
            stateRef.current.isPaused = true;
            const punchAnim = swipeSignal.type === 'left' ? 'lpunch' : 'rpunch';
            setAnimation(punchAnim);
            setTimeout(() => {
                stateRef.current.isPaused = false;
                setAnimation('run');
            }, 500);
        }

        if (stateRef.current.isPaused) return;

        // Handle tap for acceleration
        if (tapSignal !== stateRef.current.lastTapSignal) {
            stateRef.current.lastTapSignal = tapSignal;
            velocityRef.current = Math.min(velocityRef.current + ACCELERATION, MAX_SPEED);
        }

        // Decay speed back to base speed
        if (velocityRef.current > BASE_SPEED) {
            velocityRef.current -= DECAY * delta * 60;
            if (velocityRef.current < BASE_SPEED) velocityRef.current = BASE_SPEED;
        }

        const speed = parseFloat(velocityRef.current.toFixed(1));

        // Update animation based on speed
        const next = speed > 4.5 ? 'run' : 'walk';
        if (next !== animation && !stateRef.current.isPaused) {
            setAnimation(next);
        }

        // Move forward along Z axis
        const moveDistance = speed * delta;
        progressRef.current += moveDistance;

        // Update container position - move straight forward
        if (containerRef.current) {
            containerRef.current.position.z = progressRef.current;
        }
    });

    return (
        <group ref={containerRef} position={[0, 0, 0]}>
            <Suspense fallback={<Capsule castShadow receiveShadow position={[0, 1.2, 0]} args={[0.25, 0.6, 3]} />}>
                <AnimatedModel
                    scale={1}
                    basePath="/models/human/onimilio/"
                    model="rigged.glb"
                    animation={animation}
                    enableBoneCollider={false}
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
                </AnimatedModel>
            </Suspense>
            <FollowCam height={1} cameraOffset={[0, 1, -2]} targetOffset={[0, 1.8, 0]} />
        </group>
    );
})

export default Player;