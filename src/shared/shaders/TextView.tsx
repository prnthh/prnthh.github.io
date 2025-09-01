import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { FontLoader } from "three-stdlib";
import * as THREE from "three";
import { MeshBasicMaterial } from "three"; // Use MeshBasicMaterial for WebGL

interface TextViewProps {
    children?: React.ReactNode;
    position?: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
}

const TextView = ({ children, position = [0, 0, 0], rotation = [0, 0, 0], color = "#000000" }: TextViewProps) => {
    const [geometry, setGeometry] = useState<THREE.ShapeGeometry | null>(null);
    const { scene } = useThree();

    useEffect(() => {
        if (!children) return;

        const loader = new FontLoader();
        loader.load(
            "fonts/helvetiker_regular.typeface.json",
            (font) => {
                const shapes = font.generateShapes(children as string, 0.07);
                const textGeometry = new THREE.ShapeGeometry(shapes);

                // Center the text
                textGeometry.computeBoundingBox();
                if (textGeometry.boundingBox) {
                    const xMid = -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x);
                    textGeometry.translate(xMid, 0, 0);
                }

                setGeometry(textGeometry);
            },
            undefined,
            (error) => console.error("Font loading error:", error)
        );

        // Cleanup geometry on unmount
        return () => {
            if (geometry) {
                geometry.dispose();
            }
        };
    }, [children]);

    // Material
    const material = useRef(
        new MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
        })
    );

    // Dispose material on unmount
    useEffect(() => {
        return () => {
            material.current.dispose();
        };
    }, []);

    return geometry ? (
        <mesh position={position} rotation={rotation} geometry={geometry} material={material.current} />
    ) : null;
};

export default TextView;