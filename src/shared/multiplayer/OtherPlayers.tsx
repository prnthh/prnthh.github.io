import { useRef, memo, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { usePeerStates, PeerState } from "@/shared/providers/MultiplayerStore";
import { Group, MathUtils } from "three";
import { Gun } from "@/app/sketches/controllers/firstperson/Weapon";


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
    const groupRef = useRef<Group>(null);
    const gunRef = useRef<Group>(null);

    // Memoize derived values to prevent recalculation on every render
    const targetPosition = useMemo(() => state?.position || [0, 2, 0], [state?.position]);
    const targetPitch = useMemo(() => state?.rotation?.[0] || 0, [state?.rotation]);
    const targetRotationY = useMemo(() => state?.rotation?.[1] ?? 0, [state?.rotation]);
    const color = useMemo(() => state?.appearance?.color || 'orange', [state?.appearance?.color]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const pos = groupRef.current.position;
        const lerpFactor = delta * 10;

        // Teleport if distance > 5, otherwise lerp
        const distSq = (targetPosition[0] - pos.x) ** 2 + (targetPosition[1] - pos.y) ** 2 + (targetPosition[2] - pos.z) ** 2;
        if (distSq > 25) {
            pos.set(targetPosition[0], targetPosition[1], targetPosition[2]);
        } else {
            pos.x = MathUtils.lerp(pos.x, targetPosition[0], lerpFactor);
            pos.y = MathUtils.lerp(pos.y, targetPosition[1], lerpFactor);
            pos.z = MathUtils.lerp(pos.z, targetPosition[2], lerpFactor);
        }

        // Lerp rotation with angle wrapping
        let diff = targetRotationY - groupRef.current.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        groupRef.current.rotation.y += diff * lerpFactor;

        // Lerp gun pitch rotation
        if (gunRef.current) {
            gunRef.current.rotation.x = MathUtils.lerp(gunRef.current.rotation.x, targetPitch, lerpFactor);
        }
    });

    return <group ref={groupRef}>
        <CapsulePlayer color={color} />

        {/* gun */}
        <group ref={gunRef} position={[0.4, 0.2, -0.3]} >
            <Gun />
        </group>

    </group>
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    // Only re-render if state actually changed
    return (
        prevProps.peerId === nextProps.peerId &&
        prevProps.state === nextProps.state
    );
});

OtherPlayer.displayName = 'OtherPlayer';

export const CapsulePlayer = memo(({ color = 'orange' }: { color?: string }) => {
    return <mesh castShadow>
        <capsuleGeometry args={[0.3, 1.2, 8, 16]} />
        <meshStandardMaterial color={color} />
    </mesh>
});

CapsulePlayer.displayName = 'CapsulePlayer';

export default OtherPlayers;