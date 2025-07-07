"use client";

import { Effects, Html, OrbitControls, Text } from "@react-three/drei";
import { GameCanvas } from "@/shared/GameCanvas";
import AnimatedModel from "@/shared/HumanoidModel";
import { EffectComposer, Scanline } from "@react-three/postprocessing";
import Fire from "./sketches/shaders/fire/FireMaterial";
import { CuboidCollider, Physics, RapierRigidBody, RigidBody, useRevoluteJoint } from "@react-three/rapier";
import { useRef } from "react";


function SwingingModelOnBar() {
  // Bar (fixed)
  const barRef = useRef<RapierRigidBody>(null as unknown as RapierRigidBody);
  // Model (dynamic)
  const modelRef = useRef<RapierRigidBody>(null as unknown as RapierRigidBody);

  // Revolute joint: anchor at[0, 1.5, 0.24](bar center), swing around Z axis
  useRevoluteJoint(barRef, modelRef, [
    [0, 0, 0], // bar local anchor
    [0, 1.97, 0.22], // model local anchor (model's hands at y=0.46 above its center)
    [1, 0, 0], // axis (Z axis)
  ]);

  return (
    <>
      <RigidBody ref={barRef} type="fixed" position={[0, 1.5, 0.24]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.09, 0.05]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      </RigidBody>
      <RigidBody colliders={false} type="dynamic" ref={modelRef} position={[0, -0.47, 0]}>
        <CuboidCollider args={[0.2, 0.8, 0.2]} position={[0, 1, 0]} restitution={0.5} friction={1} />
        <AnimatedModel
          basePath={"/models/human/onimilio/"}
          model={"rigged.glb"}
          rotation={[-Math.PI / 2, 0, 0]}
          height={2}
          scale={2}
          position={[0, 0, 0]}
          animationOverrides={{ idle: "anim/hang.fbx" }}
          onClick={() => {
            console.log("Model clicked, applying impulse");
            if (modelRef.current) {
              // Apply an impulse in the +X direction (perpendicular to the Z axis)
              modelRef.current.applyImpulse({ x: 0, y: 0, z: -0.1 }, true);
              console.log("Impulse applied to model");
            }
          }}
        />
      </RigidBody>
    </>
  );
}


export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="absolute top-0 left-0 w-screen h-screen">
          <GameCanvas camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 1, 2], rotation: [-0.2, 0, 0] }} shadows>
            <color attach="background" args={['darkred']} />
            <Physics>

              <SwingingModelOnBar />
            </Physics>

            <ambientLight intensity={0.8} />
            <Text color="black" textAlign="center" scale={0.04} position={[0, 1.5, 0.27]}>
              hi im prnth, nothing to see here
            </Text>
            <pointLight position={[0, -1, 2]} intensity={50} color={'orange'} />
            {/* <ShadowLight offset={[-2, -6, -2]} /> */}
            <Fire scale={[2, 2, 1]} position={[0, 0, 0]} />
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