import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep } from "@react-three/rapier";
import useInputStore from "../controls/InputStore";
import { RigidHumanoidModelRef } from "@/shared/ped/physics/types";

interface TapControlsProps {
    modelRef: React.RefObject<RigidHumanoidModelRef | null>;
    setAnimation: (animation: "idle" | "walk" | "run") => void;
}

export default function TapControls({ modelRef, setAnimation }: TapControlsProps) {
    const velocityRef = useRef(0);
    const currentAnimRef = useRef<"idle" | "walk" | "run">("idle");
    const stateRef = useRef({
        isPaused: false,
        lastSwipeTimestamp: 0,
        lastTapSignal: 0
    });

    const MAX_SPEED = 5;
    const ACCELERATION = 1;
    const DECAY = 0.02;

    useFrame((state, delta) => {
        const { tapSignal, swipeSignal } = useInputStore.getState();

        // Handle swipe for punch animations
        if (swipeSignal && swipeSignal.timestamp !== stateRef.current.lastSwipeTimestamp) {
            stateRef.current.lastSwipeTimestamp = swipeSignal.timestamp;
            stateRef.current.isPaused = true;
            const punchAnim = swipeSignal.type === 'left' ? 'lpunch' : 'rpunch';
            setAnimation(punchAnim as any);
            setTimeout(() => {
                stateRef.current.isPaused = false;
                setAnimation('idle');
            }, 500);
        }

        if (stateRef.current.isPaused) return;

        // Handle tap for acceleration
        if (tapSignal !== stateRef.current.lastTapSignal) {
            stateRef.current.lastTapSignal = tapSignal;
            velocityRef.current = Math.min(velocityRef.current + ACCELERATION, MAX_SPEED);
        }

        // Apply decay
        velocityRef.current -= DECAY * delta * 60;
        if (velocityRef.current < 0.01) velocityRef.current = 0;

        // Update animation based on speed
        const speed = velocityRef.current;
        const currentAnim = currentAnimRef.current;
        const next = currentAnim === 'idle' && speed > 0.1 ? 'walk'
            : currentAnim === 'walk' ? (speed < 0.1 ? 'idle' : speed > 3.0 ? 'run' : 'walk')
                : currentAnim === 'run' && speed < 2.0 ? 'walk'
                    : currentAnim;

        if (next !== currentAnim) {
            currentAnimRef.current = next;
            setAnimation(next);
        }
    }, -100);

    useBeforePhysicsStep(() => {
        if (!modelRef.current?.rbref.current) return;

        // Move forward in positive Z direction (standard Three.js convention)
        const rb = modelRef.current.rbref.current;
        const speed = parseFloat(velocityRef.current.toFixed(1));
        rb.setLinvel({ x: 0, y: rb.linvel().y, z: speed }, true);
    });

    return null;
}
