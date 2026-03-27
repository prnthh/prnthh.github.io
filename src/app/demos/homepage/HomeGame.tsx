"use client";

import { useRef } from "react";
import { OrthographicCamera } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { extend } from "@react-three/fiber";
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial, MeshPhongNodeMaterial, SpriteNodeMaterial, PCFShadowMap, NearestFilter, Texture, RepeatWrapping, SRGBColorSpace, TextureLoader, Mesh, MathUtils } from "three/webgpu";

import { GameCanvas } from "react-three-game";
import { useCanvasReady } from "@/app/sketches/loading/GameWithLoader";
import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import PixelationEffect from "./PixelationEffect";

extend({
    MeshBasicNodeMaterial: MeshBasicNodeMaterial,
    MeshStandardNodeMaterial: MeshStandardNodeMaterial,
    MeshPhongNodeMaterial: MeshPhongNodeMaterial,
    SpriteNodeMaterial: SpriteNodeMaterial,
});

function pixelTexture(texture: Texture) {
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    return texture;
}

function easeInOutCubic(x: number) {
    return x ** 2 * 3 - x ** 3 * 2;
}

function linearStep(x: number, edge0: number, edge1: number) {
    const w = edge1 - edge0;
    const m = 1 / w;
    const y0 = -m * edge0;
    return MathUtils.clamp(y0 + m * x, 0, 1);
}

function stopGoEased(x: number, downtime: number, period: number) {
    const cycle = (x / period) | 0;
    const tween = x - cycle * period;
    const linStep = easeInOutCubic(linearStep(tween, downtime, period));
    return cycle + linStep;
}

function Crystal() {
    const ref = useRef<Mesh>(null!);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        ref.current.position.y = 0.7 + Math.sin(t * 2) * 0.05;
        ref.current.rotation.y = stopGoEased(t, 2, 4) * 2 * Math.PI;
        (ref.current.material as any).emissiveIntensity = Math.sin(t * 3) * 0.5 + 0.5;
    });

    return (
        <mesh ref={ref} castShadow receiveShadow>
            <icosahedronGeometry args={[0.2]} />
            <meshPhongNodeMaterial
                color={0x68b7e9}
                emissive={0x4f7e8b}
                shininess={10}
                specular={0xffffff}
            />
        </mesh>
    );
}

function PixelScene() {
    const texChecker = pixelTexture(
        useLoader(TextureLoader, "/textures/prototyping_textures_32x32px/Prototype_checkers_03_32x32px.png")
    );
    const texChecker2 = pixelTexture(
        useLoader(TextureLoader, "/textures/prototyping_textures_32x32px/Prototype_checkers_03_32x32px.png")
    );
    texChecker.repeat.set(3, 3);
    texChecker2.repeat.set(1.5, 1.5);

    return (
        <>
            {/* Box 1 */}
            <mesh
                castShadow
                receiveShadow
                position={[0, 0.2001, 0]}
                rotation={[0, Math.PI / 4, 0]}
            >
                <boxGeometry args={[0.4, 0.4, 0.4]} />
                <meshPhongNodeMaterial map={texChecker2} />
            </mesh>


            {/* Ground plane */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2, 2]} />
                <meshPhongNodeMaterial map={texChecker} />
            </mesh>

            {/* Crystal */}
            <Crystal />

            {/* Lights */}
            <ambientLight color={0x757f8e} intensity={3} />

            <directionalLight
                color={0xfffecd}
                intensity={1.5}
                position={[100, 100, 100]}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />

            <spotLight
                color={0xffc100}
                intensity={10}
                distance={10}
                angle={Math.PI / 16}
                penumbra={0.02}
                decay={2}
                position={[2, 2, 0]}
                target-position={[0, 0, 0]}
                castShadow
            />
        </>
    );
}

function ReadyNotifier() {
    useCanvasReady();
    return null;
}

export default function HomeGame() {
    return (
        <Controls>
            <GameCanvas>
                <OrthographicCamera
                    makeDefault
                    position={[0, 2 * Math.tan(Math.PI / 6), 2]}
                    rotation={[-Math.PI / 6, 0, 0]}
                    zoom={400}
                    near={0.1}
                    far={10}
                />

                <PixelScene />
                <PixelationEffect pixelSize={6} normalEdgeStrength={0.3} depthEdgeStrength={0.4} />

                <ReadyNotifier />
            </GameCanvas>
        </Controls>
    );
}
