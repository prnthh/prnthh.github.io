"use client";

import { Physics } from "@react-three/rapier";
import { Environment } from "@react-three/drei";

import { GameCanvas } from "react-three-game";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import CombinedController from "@/app/react-three-controller/combined/CombinedController";

import { Csm } from "@/shared/Csm";
import DebugGround from "@/shared/ground/DebugGround";
import DialogCollider from "@/shared/physics/DialogCollider";

export default function Home() {
  return (
    <div className="items-center justify-items-center min-h-screen">
      <header className="fixed top-8 right-12 underline underline-offset-4 text-lg flex items-center justify-center gap-6 z-100 dark:text-white">
        <a
          className="flex items-center gap-2 hover:underline-offset-5"
          href="https://pockit.world/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pockit
        </a>
        <a
          className="flex items-center gap-2 hover:underline-offset-5"
          href="https://x.com/prnth_"
          target="_blank"
          rel="noopener noreferrer"
        >
          X
        </a>
      </header>
      <div className="w-full" style={{ height: "100vh" }}>
        <Controls>
          <GameCanvas>
            <Physics>
              <Csm>
                <DebugGround />
                <ambientLight intensity={0.5} />
                <CombinedController mode={'wawa'} />

                <DialogCollider label="omg its prnth.com!" />
              </Csm>


              <Environment background frames={1}>
                <mesh>
                  <sphereGeometry args={[50, 64, 64]} />
                  <meshBasicMaterial
                    color="#87CEEB"
                    side={2}
                    depthWrite={false}
                    fog={false}
                  />
                </mesh>
              </Environment>
            </Physics>
          </GameCanvas>
        </Controls>
      </div>
    </div>
  );
}
