import { ThreeEvent } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useRef, useEffect } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const DRAG_THRESHOLD = 5;

const DebugGround = ({
    debug = false,
    size = 100,
    position = [0, -0.5, 0],
    rotation = [0, 0, 0],
    onClick,
}: {
    debug?: boolean;
    size?: number;
    position?: [number, number, number];
    rotation?: [number, number, number];
    onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) => {
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
    const texture = useTexture("/textures/proto32/grey.png");

    useEffect(() => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(size / 2, size / 2);
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
    }, [texture, size]);

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        if (!pointerDownPos.current) return;

        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < DRAG_THRESHOLD) {
            onClick?.(e as any);
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
                        onPointerUp={handlePointerUp}
                    >
                        <planeGeometry args={[size, size]} />
                        <meshStandardMaterial map={texture} color="gray" />
                    </mesh>
                </RigidBody>
                {debug && <gridHelper
                    args={[size, size]}
                    position={[0, 0.01, 0]}
                />}
            </group>
        </>
    );
};

export default DebugGround;