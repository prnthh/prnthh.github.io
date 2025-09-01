import { useTexture } from "@react-three/drei";
import { useEffect, useState } from "react";

const ImageFrame = ({ url, position = [0, 0, 0], broken = false }: { url: string, position?: [number, number, number], broken?: boolean }) => {
    const texture = useTexture(url);
    const brokenTexture = useTexture("/textures/broken.png");
    const [size, setSize] = useState<[number, number]>([1, 1]);

    const frameThickness = 0.05; // Thickness of the frame

    useEffect(() => {
        if (texture) {
            const aspect = texture.image.width / texture.image.height;
            setSize([1, 1 / aspect]);
        }
    }, [texture]);

    return (
        <mesh position={position}>
            <boxGeometry args={[size[0], size[1], frameThickness]} />
            <meshStandardMaterial color="#33261c" />
            <mesh position={[0, 0, frameThickness / 2 + 0.001]}>
                <planeGeometry args={size} />
                <meshStandardMaterial map={texture} />
            </mesh>
            {broken && <mesh position={[0, 0, frameThickness / 2 + 0.002]}>
                <planeGeometry args={size} />
                <meshStandardMaterial transparent map={brokenTexture} />
            </mesh>}
        </mesh>

    );
};

export default ImageFrame;
