import { ReactNode, useMemo } from "react";
import { DoubleSide, MeshBasicMaterial } from "three";
import { Text } from 'three-text/three/react';

Text.setHarfBuzzPath('/fonts/hb.wasm');

export const DemoGroup = ({ label = 'demo', position, size = [3, 3], children }: { label?: string, position: [number, number, number], size?: [number, number], children?: ReactNode }) => {
    const halfW = size[0] / 2;
    const halfH = size[1] / 2;
    const thickness = 0.15;
    const y = position[1] + 0.05;
    const labelMaterial = useMemo(() => new MeshBasicMaterial({ color: 0xff0000, side: DoubleSide }), []);

    return <>
        <group position={[position[0], y, position[2]]}>
            {/* Top edge */}
            <mesh position={[0, 0, -halfH]}>
                <boxGeometry args={[size[0] + thickness, 0.01, thickness]} />
                <meshBasicMaterial color="white" />
            </mesh>
            {/* Bottom edge */}
            <mesh position={[0, 0, halfH]}>
                <boxGeometry args={[size[0] + thickness, 0.01, thickness]} />
                <meshBasicMaterial color="white" />
            </mesh>
            {/* Left edge */}
            <mesh position={[-halfW, 0, 0]}>
                <boxGeometry args={[thickness, 0.01, size[1]]} />
                <meshBasicMaterial color="white" />
            </mesh>
            {/* Right edge */}
            <mesh position={[halfW, 0, 0]}>
                <boxGeometry args={[thickness, 0.01, size[1]]} />
                <meshBasicMaterial color="white" />
            </mesh>
            {/* Label */}
            <group position={[-halfW, 0.1, halfH + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <Text material={labelMaterial} font="/fonts/NimbusSanL-Reg.woff" size={0.4} depth={0} layout={{ align: 'center', width: size[0] }}>
                    {label}
                </Text>
            </group>
        </group>

        <group position={position}>
            {children}
        </group>
    </>
}
