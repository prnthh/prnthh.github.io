import { useRef } from "react";
import Gun from "@/app/sketches/demos/killbox/Gun";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { usePeerStates } from "@/shared/providers/MultiplayerStore";


const OtherPlayers = () => {
    const peerStates = usePeerStates();

    return <>
        {Object.entries(peerStates).map(([peerId, state]) => (
            <OtherPlayer key={peerId} peerId={peerId} state={state} />
        ))}
    </>;
}

const OtherPlayer = ({ peerId, state }: { peerId: string, state: any }) => {
    const groupRef = useRef<THREE.Group>(null);
    const gunRef = useRef<THREE.Group>(null);

    const targetPosition = state?.position || [0, 2, 0];
    const targetPitch = state?.rotation[0] || 0;
    const targetRotationY = state?.rotation?.[1] ?? 0;
    const color = state?.appearance?.color || 'orange';

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const pos = groupRef.current.position;
        const lerpFactor = delta * 10;

        // Teleport if distance > 5, otherwise lerp
        const distSq = (targetPosition[0] - pos.x) ** 2 + (targetPosition[1] - pos.y) ** 2 + (targetPosition[2] - pos.z) ** 2;
        if (distSq > 25) {
            pos.set(targetPosition[0], targetPosition[1], targetPosition[2]);
        } else {
            pos.x = THREE.MathUtils.lerp(pos.x, targetPosition[0], lerpFactor);
            pos.y = THREE.MathUtils.lerp(pos.y, targetPosition[1], lerpFactor);
            pos.z = THREE.MathUtils.lerp(pos.z, targetPosition[2], lerpFactor);
        }

        // Lerp rotation with angle wrapping
        let diff = targetRotationY - groupRef.current.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        groupRef.current.rotation.y += diff * lerpFactor;

        // Lerp gun pitch rotation
        if (gunRef.current) {
            gunRef.current.rotation.x = THREE.MathUtils.lerp(gunRef.current.rotation.x, targetPitch, lerpFactor);
        }
    });

    return <group ref={groupRef}>
        <CapsulePlayer color={color} />

        {/* gun */}
        <group ref={gunRef} position={[0.4, 0.2, -0.3]} >
            <Gun />
        </group>

    </group>
}

export const CapsulePlayer = ({ color = 'orange' }: { color?: string }) => {
    return <mesh castShadow>
        <capsuleGeometry args={[0.3, 1.2, 8, 16]} />
        <meshStandardMaterial color={color} />
    </mesh>
}

export default OtherPlayers;