import { ThreeEvent } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useRef } from "react";

const DRAG_THRESHOLD = 5;

const DebugGround = ({
    size = 100,
    position = [0, -0.5, 0],
    rotation = [0, 0, 0],
    onClick,
}: {
    size?: number;
    position?: [number, number, number];
    rotation?: [number, number, number];
    onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) => {
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        if (!pointerDownPos.current) return;

        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < DRAG_THRESHOLD) {
            onClick?.(e);
        }
    };

    return (
        <>
            <group position={position} rotation={rotation}>
                <RigidBody type="fixed" colliders={false}>
                    <CuboidCollider args={[size / 2, 0.01, size / 2]} />
                    <mesh
                        receiveShadow
                        rotation={[-Math.PI / 2, 0, 0]}
                        onPointerDown={handlePointerDown}
                        onClick={handleClick}
                    >
                        <planeGeometry args={[size, size]} />
                        <meshStandardMaterial color="gray" />
                    </mesh>
                </RigidBody>
                <gridHelper
                    args={[size, size]}
                    position={[0, 0.01, 0]}
                />
            </group>
        </>
    );
};

export default DebugGround;