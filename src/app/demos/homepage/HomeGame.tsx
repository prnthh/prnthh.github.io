"use client";

import { useMemo, useRef } from "react";
import { OrbitControls, OrthographicCamera, useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import {
    Group,
    MathUtils,
    Mesh,
    NearestFilter,
    RepeatWrapping,
    SRGBColorSpace,
    Texture,
    TextureLoader,
} from "three";

import { GameCanvas } from "react-three-game";
import Controls from "../../react-three-controller/controls/ControlsProvider";
import { useCanvasReady } from "../../sketches/loading/GameWithLoader";
import PixelationEffect from "./PixelationEffect";

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

function useTabletScene() {
    const { scene } = useGLTF("/models/environment/picocad/tablet.glb");
    return useMemo(() => {
        const tablet = scene.clone();

        tablet.traverse((child) => {
            if (!("isMesh" in child) || !child.isMesh) return;

            const mesh = child as Mesh;
            mesh.castShadow = true;
            // mesh.receiveShadow = true;
        });

        return tablet;
    }, [scene]);
}

function FloatingTablet() {
    const ref = useRef<Group>(null!);
    const clonedScene = useTabletScene();

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        ref.current.position.y = 0.2 + Math.sin(t * 2) * 0.05;
        ref.current.rotation.y = stopGoEased(t, 2, 4) * 2 * Math.PI;
    });

    return (
        <group position={[0, 0.6, 0]} ref={ref}>
            <primitive object={clonedScene} rotation={[0, -Math.PI / 2, 0]} scale={0.08} />
        </group>
    );
}

function PixelScene() {
    const texChecker = pixelTexture(useLoader(TextureLoader, "/textures/proto32/checkers_03.png"));
    texChecker.repeat.set(3, 3);

    return (
        <>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2, 2]} />
                <meshPhongMaterial map={texChecker} />
            </mesh>

            <FloatingTablet />

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
                    position={[0, 0.8, 2]}
                    rotation={[-Math.PI / 16, 0, 0]}
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
