"use client";

import { Environment, Helper, OrbitControls, useTexture } from "@react-three/drei";
import { BackSide, DirectionalLightHelper, NearestFilter } from "three";
import { GameCanvas } from "react-three-game";
import { useCanvasReady } from "@/app/sketches/loading/GameWithLoader";

import { MapProvider } from "@/app/react-three-terrain/MapProvider";
import { MapTiles } from "@/app/react-three-terrain/MapTile";
import Ocean from "@/shared/shaders/Water";



export default function Game() {
    return <GameCanvas camera={{ position: [0, 5, -12] }}>
        <Lighting />
        <SkyEnvironment />
        <InnerGame />
        <MapProvider
            startX={-1}
            endX={1}
            startZ={-1}
            endZ={1}
            tileSizePx={256}
        >
            <MapTiles
                startX={-1}
                startZ={-1}
                endX={1}
                endZ={1}
                tileSize={100}
            //  onPointerMove={isBrushMode ? handlePointerMove : undefined}
            // onPointerDown={isBrushMode ? handlePointerDown : undefined}
            // onPointerUp={isBrushMode ? handlePointerUp : undefined}
            // onPointerLeave={isBrushMode ? handlePointerLeave : undefined}
            />
        </MapProvider>

        <group position={[0, 0.2, 0]}>
            <Ocean size={20} distortionScale={1} alpha={0.5} />
        </group>
        <ambientLight intensity={1} />

    </GameCanvas>

}


const SkyEnvironment = ({ pixelated = false }) => {
    const texture = useTexture('/textures/skybox/skybox1.jpg');

    if (pixelated) {
        texture.minFilter = NearestFilter;
        texture.magFilter = NearestFilter;
    }

    return <>
        {/* <fog attach="fog" args={['#87ceeb', 10, 50]} /> */}
        <color attach={"background"} args={['#87ceeb']} />
        <Environment background>
            <mesh >
                <sphereGeometry args={[10, 64, 64]} />
                <meshBasicMaterial map={texture} side={BackSide} />
            </mesh>
        </Environment>
    </>
}

const Lighting = ({ debug }: { debug?: boolean }) => {
    return <directionalLight
        position={[5, 10, 5]}
        intensity={2}
        castShadow
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={15}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
    >
        {debug && <Helper type={DirectionalLightHelper} />}
    </directionalLight>
}

const InnerGame = () => {
    useCanvasReady();

    return <>
        <OrbitControls />
    </>
}


