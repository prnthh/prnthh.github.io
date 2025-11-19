"use client";

import { DirectionalLightHelper, PCFSoftShadowMap } from "three";
import { Helper, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import Environment from "@/shared/ground/Playground";
import GameCanvas from "@/shared/GameCanvas";
import CrawlerApp from "@/shared/ik/CrawlerPed";
import KeyboardInput from "../../controllers/firstperson/KeyboardInput";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics gravity={[0, -20, 0]}>

                        <CrawlerApp />
                        <KeyboardInput />

                        <Environment />
                        {/* <MapModel /> */}
                    </Physics>

                    {<OrbitControls makeDefault />}
                    <PerspectiveCamera makeDefault position={[0, 5, 15]} />


                    <ambientLight intensity={1.5} />

                    <directionalLight
                        position={[-30, 20, 30]}
                        intensity={1.5}
                        castShadow
                        shadow-mapSize-height={2048}
                        shadow-mapSize-width={2048}
                        shadow-camera-near={0.1}
                        shadow-camera-far={100}
                        shadow-camera-left={-30}
                        shadow-camera-right={30}
                        shadow-camera-top={15}
                        shadow-camera-bottom={-20}
                        shadow-bias={-0.005}
                    >
                        {<Helper type={DirectionalLightHelper} />}
                    </directionalLight>
                </GameCanvas>
            </div>
        </div>
    );
}
