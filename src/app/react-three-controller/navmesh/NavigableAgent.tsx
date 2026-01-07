import { useEffect, useRef, useState, ReactNode, memo } from "react";
import { Group } from "three";
import { useFrame } from "@react-three/fiber";
import { AgentHandle, useNavigableContext, Vector3Tuple } from "./NavigableContext";
import { AnimatedModelRef } from "../ped/types";
import AnimatedModel from "../../react-three-character/HumanoidModel";

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_OVERRIDES = {
    walk: "anim/walk.fbx",
    run: "anim/run.fbx",
};

// ============================================================================
// Types
// ============================================================================

export type NavigableAgentProps = {
    /** Initial spawn position */
    position: Vector3Tuple;
    /** Target position to navigate to */
    target?: Vector3Tuple;
    /** Callback when agent reaches target */
    onTargetReached?: () => void;
    /** Callback each frame with position/velocity */
    onUpdate?: (position: Vector3Tuple, velocity: Vector3Tuple) => void;
    /** Agent radius for collision */
    radius?: number;
    /** Agent movement speed */
    maxSpeed?: number;
    /** Agent acceleration */
    maxAcceleration?: number;
    /** Distance threshold to trigger onTargetReached */
    arrivalThreshold?: number;
    /** Show default animated model */
    showModel?: boolean;
    /** Model base path */
    basePath?: string;
    /** Model file name */
    model?: string;
    /** Model height for scaling */
    height?: number;
    /** Custom content to render with agent */
    children?: ReactNode;
};

// ============================================================================
// NavigableAgent Component
// ============================================================================

export const NavigableAgent = memo(({
    position,
    target,
    onTargetReached,
    onUpdate,
    radius = 0.5,
    maxSpeed = 4.0,
    maxAcceleration = 4.0,
    arrivalThreshold = 1.0,
    showModel = true,
    basePath = "/models/human/onimilio/",
    model = "rigged.glb",
    height = 1.5,
    children,
}: NavigableAgentProps) => {
    const { isReady, registerAgent, unregisterAgent } = useNavigableContext();

    // Refs
    const agentRef = useRef<AgentHandle | null>(null);
    const groupRef = useRef<Group>(null);
    const modelRef = useRef<AnimatedModelRef>(null);
    const initialPosition = useRef(position);
    const lastTarget = useRef<Vector3Tuple | undefined>(undefined);
    const hasReachedTarget = useRef(false);
    const targetRotation = useRef(0);
    const velocityRef = useRef<Vector3Tuple>([0, 0, 0]);
    const currentAnimationRef = useRef<string>("idle");

    // State
    const [isRegistered, setIsRegistered] = useState(false);

    // Register with crowd when ready
    useEffect(() => {
        if (!isReady || agentRef.current) return;

        const handle = registerAgent(initialPosition.current, {
            radius,
            height,
            maxSpeed,
            maxAcceleration,
        });

        if (handle) {
            agentRef.current = handle;
            setIsRegistered(true);

            // Set initial target
            if (target) {
                handle.setTarget(target);
                lastTarget.current = target;
            }
        }

        return () => {
            if (agentRef.current) {
                unregisterAgent(agentRef.current.id);
                agentRef.current = null;
                setIsRegistered(false);
            }
        };
    }, [isReady, registerAgent, unregisterAgent, radius, height, maxSpeed, maxAcceleration]);

    // Update target when changed
    useEffect(() => {
        if (!isRegistered || !agentRef.current || !target) return;

        const prev = lastTarget.current;
        if (prev?.[0] === target[0] && prev?.[1] === target[1] && prev?.[2] === target[2]) return;

        agentRef.current.setTarget(target);
        lastTarget.current = target;
        hasReachedTarget.current = false;
    }, [target, isRegistered]);

    // Frame update - all animation and position updates happen in the frame loop
    useFrame((_, delta) => {
        const agent = agentRef.current;
        const group = groupRef.current;
        if (!isRegistered || !agent || !group) return;

        const pos = agent.getPosition();
        const vel = agent.getVelocity();
        velocityRef.current = vel;
        onUpdate?.(pos, vel);

        // Animation based on speed - update directly via ref to avoid React state
        const speed = Math.sqrt(vel[0] ** 2 + vel[2] ** 2);
        const newAnimation = speed > 2.0 ? "run" : speed > 0.3 ? "walk" : "idle";
        if (currentAnimationRef.current !== newAnimation) {
            currentAnimationRef.current = newAnimation;
            modelRef.current?.setAnimation(newAnimation);
        }

        // Check arrival
        if (target && !hasReachedTarget.current) {
            const dx = target[0] - pos[0];
            const dz = target[2] - pos[2];
            if (Math.sqrt(dx * dx + dz * dz) < arrivalThreshold) {
                hasReachedTarget.current = true;
                onTargetReached?.();
            }
        }

        // Smooth position interpolation
        const lerpFactor = Math.min(1, delta * 10);
        group.position.x += (pos[0] - group.position.x) * lerpFactor;
        group.position.y += (pos[1] - group.position.y) * lerpFactor;
        group.position.z += (pos[2] - group.position.z) * lerpFactor;

        // Rotation from velocity
        if (speed > 0.1) {
            targetRotation.current = Math.atan2(vel[0], vel[2]);
        }

        // Smooth rotation
        let rotDiff = targetRotation.current - group.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        group.rotation.y += rotDiff * Math.min(1, delta * 8);
    });

    if (!isRegistered) return null;

    return (
        <group ref={groupRef} position={position}>
            {showModel && (
                <AnimatedModel
                    ref={modelRef}
                    basePath={basePath}
                    model={model}
                    height={height}
                    animation="idle"
                    animationOverrides={ANIMATION_OVERRIDES}
                />
            )}
            {children}
        </group>
    );
});

NavigableAgent.displayName = "NavigableAgent";

export default NavigableAgent;
