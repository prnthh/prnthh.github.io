"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { DSGround } from "./ground/DSGround";
import TerrainTile from "./ground/TerrainTile";
import GameCanvas from "@/shared/GameCanvas";
import SplatGround from "./ground/SplatGround";
import ShadedGround from "./ground/ShadedGround";
import ColliderTerrain from "./ground/ColliderTerrain";
import Playground from "./ground/Playground";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>

                        {/* <ShadedGround position={[-32, 0, 0]} /> */}
                        <ColliderTerrain position={[-48, 0, -16]} />
                        <SplatGround position={[-16, 0, -16]} />
                        <DSGround position={[16, 0, -16]} />
                        <Playground position={[48, 0, -16]} />

                        <TerrainTile position={[-16, 0, 16]} />
                        <TerrainTile
                            position={[16, 0, 16]}
                            map='/textures/floor/rocks/gray_rocks_diff_1k.jpg'
                            displacementMap='/textures/floor/rocks/gray_rocks_disp_1k.png'
                            normalMap='/textures/floor/rocks/gray_rocks_nor_gl_1k.jpg'
                            roughnessMap='/textures/floor/rocks/gray_rocks_rough_1k.jpg'
                        />

                        <ambientLight intensity={0.5} />
                        <pointLight position={[0, 100, 0]} intensity={20000} />
                        <OrbitControls />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}
