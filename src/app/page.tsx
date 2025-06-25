"use client";

import { Box, Effects, Html, OrbitControls, SpotLight, Text } from "@react-three/drei";
import { GameCanvas } from "@/shared/GameCanvas";
import AnimatedModel from "@/shared/HumanoidModel";
import { ShadowLight } from "./sketches/lighting/shadowmap/ShadowLight";
import { EffectComposer, Pixelation, Scanline } from "@react-three/postprocessing";
import Fire from "./sketches/shaders/fire/FireMaterial";


export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="absolute top-0 left-0 w-screen h-screen">
          <GameCanvas camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 1, 2], rotation: [-0.2, 0, 0] }} shadows>
            <color attach="background" args={['darkred']} />
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
            <Text color="black" textAlign="center" scale={0.04} position={[0, 1.5, 0.27]}>
              hi im prnth, nothing to see here
            </Text>
            <pointLight position={[0, -1, 2]} intensity={50} />
            {/* <ShadowLight offset={[-2, -6, -2]} /> */}
            <Fire />
            <EffectComposer>
              <Scanline density={2} opacity={0.1} />
            </EffectComposer>
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