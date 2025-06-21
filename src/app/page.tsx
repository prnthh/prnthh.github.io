"use client";

import { Box, Html, OrbitControls } from "@react-three/drei";
import { GameCanvas } from "@/shared/GameCanvas";
import AnimatedModel from "@/shared/HumanoidModel";
import { ShadowLight } from "./sketches/lighting/shadowmap/ShadowLight";


export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="absolute top-0 left-0 w-screen h-screen">
          <GameCanvas camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 1, 2], rotation: [-0.2, 0, 0] }} shadows>
            <AnimatedModel
              basePath={"/models/human/onimilio/"}
              model={'rigged.glb'}
              rotation={[-Math.PI / 2, 0, 0]}
              height={2}
              scale={2}
              position={[0, -0.46, 0]}
              animationOverrides={{
                idle: 'anim/hang.fbx',
              }}
            />
            <ambientLight intensity={0.8} />
            <Box position={[0, 1.5, 0.24]} args={[0.7, 0.09, 0.05]} castShadow receiveShadow />
            <Html transform center scale={0.01} position={[0, 1.5, 0.24]} className="text-center">
              <div className="w-[285px] backdrop-blur-sm scale-[10]">
                hi im prnth, nothing to see here
              </div>
            </Html>
            <ShadowLight offset={[-2, -6, -2]} />
            {/* <OrbitControls /> */}
          </GameCanvas>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center z-20">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://x.com/prnth_"
          target="_blank"
          rel="noopener noreferrer"
        >
          X
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://pockit.world/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pockit
        </a>
      </footer>
    </div >
  );
}