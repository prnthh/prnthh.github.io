
import { useRef, forwardRef, useImperativeHandle, useState, useMemo, useEffect, Suspense } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import { FollowCam } from "@/shared/cameras/FollowCam";
import { useInputStore } from "@/shared/providers/InputStore";
import { Box } from "@react-three/drei";

interface PlayerHandle {
    tap: () => void;
    getSpeed: () => number;
    swipe: (type: 'left' | 'right') => void;
}

interface PlayerProps {
    groupRef?: React.RefObject<THREE.Group>;
}

const Player = forwardRef<PlayerHandle, PlayerProps>((props, ref) => {
    const [animation, setAnimation] = useState<string>('run');
    const { groupRef } = props;
    const containerRef = useRef<THREE.Group>(null!);

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
    const SPLINE_LENGTH = 10000; // Very long straight line

    // Create a straight line spline (along Z axis)
    const spline = useMemo(() => {
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, SPLINE_LENGTH)
        ];
        return new THREE.CatmullRomCurve3(points);
    }, []);

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
            (groupRef as React.MutableRefObject<THREE.Group>).current = containerRef.current;
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

        const speed = velocityRef.current;

        // Update animation based on speed
        const next = speed > 4.5 ? 'run' : 'walk';
        if (next !== animation && !stateRef.current.isPaused) {
            setAnimation(next);
        }

        // Move along spline
        const moveDistance = speed * delta;
        const normalizedDistance = moveDistance / SPLINE_LENGTH;
        progressRef.current += normalizedDistance;

        // Keep progress in valid range
        if (progressRef.current > 1) {
            progressRef.current = progressRef.current % 1;
        }

        // Get position and tangent from spline
        const position = spline.getPointAt(progressRef.current);
        const tangent = spline.getTangentAt(progressRef.current);

        // Update container position
        if (containerRef.current) {
            containerRef.current.position.copy(position);

            // Set rotation to face along the spline direction
            const lookAtPoint = position.clone().add(tangent);
            containerRef.current.lookAt(lookAtPoint);
        }
    });

    return (
        <group ref={containerRef} position={[0, 0, 0]}>
            <Suspense fallback={<Box args={[0.5, 2, 0.5]} />}>
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