import { useLoader } from "@react-three/fiber";
import type { ThreeElements, ThreeEvent } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { LinearMipmapLinearFilter, NearestFilter, RepeatWrapping, SRGBColorSpace, TextureLoader } from "three";
import type { Texture } from "three";

const DRAG_THRESHOLD = 5;
const DEFAULT_TEXTURE_URL = "/textures/proto32/grey.png";

function repeatedTexture(texture: Texture) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.magFilter = NearestFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.colorSpace = SRGBColorSpace;
    return texture;
}

type DebugGroundVisualProps = ThreeElements["mesh"] & {
    size?: number;
    textureUrl?: string;
};

const DebugGround = ({
    debug = false,
    size = 100,
    textureUrl = DEFAULT_TEXTURE_URL,
    position = [0, -0.5, 0],
    rotation = [0, 0, 0],
    onClick,
}: {
    debug?: boolean;
    size?: number;
    textureUrl?: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) => {
    const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        if (!pointerDownPos.current) return;

        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < DRAG_THRESHOLD) {
            onClick?.(e as unknown as ThreeEvent<MouseEvent>);
        }
    };

    return (
        <>
            <group position={position} rotation={rotation}>
                <DebugGroundVisual
                    size={size}
                    textureUrl={textureUrl}
                    receiveShadow
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                />
                {debug && <gridHelper
                    args={[size, size]}
                    position={[0, 0.01, 0]}
                />}
            </group>
        </>
    );
};

export function DebugGroundVisual({
    size = 100,
    textureUrl = DEFAULT_TEXTURE_URL,
    rotation = [-Math.PI / 2, 0, 0],
    ...meshProps
}: DebugGroundVisualProps) {
    const texture = repeatedTexture(useLoader(TextureLoader, textureUrl));

    useEffect(() => {
        texture.repeat.set(size / 2, size / 2);
        texture.needsUpdate = true;
    }, [texture, size]);

    return (
        <mesh rotation={rotation} {...meshProps}>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial map={texture} color="gray" />
        </mesh>
    );
}

export default DebugGround;