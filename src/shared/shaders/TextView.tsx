import { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "three-text/three/react";
import type { ThreeTextGeometryInfo } from "three-text/three";
import { BufferGeometry, DoubleSide, MeshBasicMaterial } from "three";

interface TextViewProps {
    children?: React.ReactNode;
    position?: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
    size?: number;
}

Text.setHarfBuzzPath("/fonts/hb.wasm");

const TextView = ({
    children,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    color = "#000000",
    size = 1,
}: TextViewProps) => {
    const [offset, setOffset] = useState<[number, number, number]>([0, 0, 0]);
    const textContent = typeof children === "string" || typeof children === "number" ? String(children) : "";
    const material = useMemo(() => new MeshBasicMaterial({ color, side: DoubleSide }), [color]);

    useEffect(() => {
        return () => {
            material.dispose();
        };
    }, [material]);

    const handleLoad = useCallback((_geometry: BufferGeometry, info: ThreeTextGeometryInfo) => {
        if (info.planeBounds) {
            const bounds = info.planeBounds;
            const offsetX = -(bounds.min.x + bounds.max.x) / 2;

            const offsetY = -(bounds.min.y + bounds.max.y) / 2;
            setOffset([offsetX, offsetY, 0]);
        }
    }, []);

    if (!textContent) {
        return null;
    }

    return (
        <group position={position} rotation={rotation}>
            <group position={offset}>
                <Text
                    material={material}
                    font="/fonts/NotoSans-Regular.ttf"
                    size={size}
                    depth={0}
                    layout={{ align: "center", width: 0 }}
                    onLoad={handleLoad}
                >
                    {textContent}
                </Text>
            </group>
        </group>
    );
};

export default TextView;