"use client";

import { Suspense, useRef, useState } from "react";
import { OrthographicCamera } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import {
    Group,
    MathUtils,
    NearestFilter,
    RepeatWrapping,
    SRGBColorSpace,
    Texture,
    TextureLoader,
} from "three";

import { GameCanvas } from "react-three-game";
import Controls from "../../react-three-controller/controls/ControlsProvider";
import PixelationEffect from "../../tools/picocad/PixelationEffect";
import SimpleModel from "../../../shared/SimpleModel";

const HOMEPAGE_MODELS = [
    {
        name: "Tablet",
        url: "/models/environment/picocad/tablet.glb",
        scale: 0.08,
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        position: [0, 0, 0] as [number, number, number],
    },
    {
        name: "Island",
        url: "/models/environment/picocad/island.glb",
        scale: 0.08,
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        position: [0, 0.2, 0] as [number, number, number],
    },
    {
        name: "Milady",
        url: "/models/environment/picocad/milady.glb",
        scale: 0.2,
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
        position: [0, 0, 0] as [number, number, number],
    },
] as const;

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

function FloatingTablet() {
    const ref = useRef<Group>(null!);
    const [modelIndex, setModelIndex] = useState(0);
    const currentModel = HOMEPAGE_MODELS[modelIndex];

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        ref.current.position.y = 0.2 + Math.sin(t * 2) * 0.05;
        ref.current.rotation.y = stopGoEased(t, 2, 4) * 2 * Math.PI;
    });

    return (
        <group
            position={[0, 0.6, 0]}
            ref={ref}
            onClick={() => {
                setModelIndex((currentIndex) => (currentIndex + 1) % HOMEPAGE_MODELS.length);
            }}
        >
            <Suspense>
                <SimpleModel
                    key={currentModel.url}
                    modelUrl={currentModel.url}
                    position={currentModel.position}
                    rotation={currentModel.rotation}
                    scale={currentModel.scale}
                />
            </Suspense>
        </group>
    );
}

function PixelScene() {
    const texChecker = pixelTexture(useLoader(TextureLoader, "/textures/proto32/checkers_03.png"));
    texChecker.repeat.set(5, 5);

    return (
        <>
            <mesh receiveShadow rotation={[0, 0, 0]} position={[0, 0, -6]}>
                <planeGeometry args={[5, 5]} />
                <meshPhongMaterial map={texChecker} />
            </mesh>

            <FloatingTablet />

            <ambientLight color={0x757f8e} intensity={3} />

            <directionalLight
                color={0xfffecd}
                intensity={1.5}
                position={[2, 23, 100]}
                castShadow
                shadow-bias={-0.0005}
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
                shadow-bias={-0.0005}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
        </>
    );
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
                <PixelationEffect pixelSize={3} normalEdgeStrength={0.1} depthEdgeStrength={0.4} />
            </GameCanvas>
        </Controls>
    );
}
