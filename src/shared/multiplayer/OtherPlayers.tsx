import { useRef, memo, useMemo, useState, useEffect } from "react";
import { Group, MathUtils } from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import { CapsuleCollider, RigidBody, RapierRigidBody, useRapier } from "@react-three/rapier";

import { usePeerStates, PeerState } from "@/shared/providers/MultiplayerStore";
import { useGameEvents, PlayerAction } from "./TrysteroMultiplayerProvider";

import { Gun } from "@/app/react-three-controller/Weapon";

// Game-specific defaults
const MAX_HEALTH = 100;
const DEFAULT_COLOR = 'orange';


const OtherPlayers = () => {
    const peerStates = usePeerStates();

    const peerEntries = useMemo(() => Object.entries(peerStates), [peerStates]);

    return <>
        {peerEntries.map(([peerId, state]) => (
            <OtherPlayer key={peerId} peerId={peerId} state={state} />
        ))}
    </>;
}

const OtherPlayer = memo(({ peerId, state }: { peerId: string, state: PeerState }) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const innerGroupRef = useRef<Group>(null);
    const gunRef = useRef<Group>(null);
    const { sendGameEvent, onGameEvent } = useGameEvents();
    const [isFlashing, setIsFlashing] = useState(false);
    const { rapier } = useRapier();

    // Set active collision types for kinematic-to-kinematic detection
    useEffect(() => {
        if (rigidBodyRef.current) {
            const numColliders = rigidBodyRef.current.numColliders();
            for (let i = 0; i < numColliders; i++) {
                const collider = rigidBodyRef.current.collider(i);
                collider.setActiveCollisionTypes(
                    rapier.ActiveCollisionTypes.DEFAULT |
                    rapier.ActiveCollisionTypes.KINEMATIC_KINEMATIC
                );
            }
        }
    }, [rapier]);

    // Memoize derived values to prevent recalculation on every render
    const targetPosition = useMemo(() => state.position, [state.position]);
    const targetPitch = useMemo(() => state.rotation[0], [state.rotation]);
    const targetRotationY = useMemo(() => state.rotation[1], [state.rotation]);
    const color = state.data.color ?? DEFAULT_COLOR;
    const health = state.data.health ?? MAX_HEALTH;

    const handleHit = useMemo(() => () => {
        if (sendGameEvent) {
            sendGameEvent({ type: 'hit', targetPeerId: peerId });
        }
    }, [sendGameEvent, peerId]);

    // Listen for shoot actions from this peer to flash the gun
    useEffect(() => {
        if (!onGameEvent) return;

        const unsubscribe = onGameEvent((action: PlayerAction, fromPeerId: string) => {
            if (action.type === 'shoot' && fromPeerId === peerId) {
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 100);
            }
        });

        return unsubscribe;
    }, [onGameEvent, peerId]);

    useFrame((_, delta) => {
        if (!rigidBodyRef.current || !innerGroupRef.current) return;

        const lerpFactor = delta * 10;
        const currentPos = rigidBodyRef.current.translation();

        // Teleport if distance > 5, otherwise lerp
        const distSq = (targetPosition[0] - currentPos.x) ** 2 + (targetPosition[1] - currentPos.y) ** 2 + (targetPosition[2] - currentPos.z) ** 2;

        let newX, newY, newZ;
        if (distSq > 25) {
            newX = targetPosition[0];
            newY = targetPosition[1];
            newZ = targetPosition[2];
        } else {
            newX = MathUtils.lerp(currentPos.x, targetPosition[0], lerpFactor);
            newY = MathUtils.lerp(currentPos.y, targetPosition[1], lerpFactor);
            newZ = MathUtils.lerp(currentPos.z, targetPosition[2], lerpFactor);
        }

        rigidBodyRef.current.setNextKinematicTranslation({ x: newX, y: newY, z: newZ });

        // Lerp rotation with angle wrapping on the inner group
        let diff = targetRotationY - innerGroupRef.current.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        innerGroupRef.current.rotation.y += diff * lerpFactor;

        // Lerp gun pitch rotation
        if (gunRef.current) {
            gunRef.current.rotation.x = MathUtils.lerp(gunRef.current.rotation.x, targetPitch, lerpFactor);
        }
    });

    return <RigidBody
        ref={rigidBodyRef}
        name={peerId}
        sensor
        type="kinematicPosition"
        colliders={false}
        onIntersectionEnter={(e) => {
            // @ts-expect-error custom property on bullet rigidbody
            if (e.other.rigidBody?.userData?.type === "bullet") {
                handleHit();
            }
        }}
    >
        <CapsuleCollider args={[0.6, 0.3]} />

        <group ref={innerGroupRef}>
            <CapsulePlayer color={color} />

            {/* Health bar */}
            <HealthBar health={health} />

            {/* gun */}
            <group ref={gunRef} position={[0.4, 0.2, -0.3]} >
                <Gun isFlashing={isFlashing} />
            </group>
        </group>
    </RigidBody>
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Only re-render if state actually changed
    return (
        prevProps.peerId === nextProps.peerId &&
        prevProps.state === nextProps.state
    );
});

OtherPlayer.displayName = 'OtherPlayer';

const HealthBar = memo(({ health }: { health: number }) => {
    const healthPercent = health / MAX_HEALTH;
    const barWidth = 0.8;
    const barHeight = 0.08;

    // Color goes from green to red as health decreases
    const color = healthPercent > 0.5 ? 'green' : healthPercent > 0.25 ? 'orange' : 'red';

    return (
        <Billboard position={[0, 1.2, 0]} follow={true}>
            {/* Background bar */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[barWidth, barHeight]} />
                <meshBasicMaterial color="black" opacity={0.5} transparent />
            </mesh>
            {/* Health fill */}
            <mesh position={[(healthPercent - 1) * barWidth / 2, 0, 0]}>
                <planeGeometry args={[barWidth * healthPercent, barHeight]} />
                <meshBasicMaterial color={color} />
            </mesh>
        </Billboard>
    );
});

HealthBar.displayName = 'HealthBar';

export const CapsulePlayer = memo(({ color = 'orange' }: { color?: string }) => {
    return <mesh castShadow>
        <capsuleGeometry args={[0.3, 1.2, 8, 16]} />
        <meshStandardMaterial color={color} />
    </mesh>
});

CapsulePlayer.displayName = 'CapsulePlayer';

export default OtherPlayers;