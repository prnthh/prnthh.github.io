"use client";

import { useRef } from "react";
import { GameCanvas, PrefabRoot, registerComponent } from "react-three-game";
import Controls from "@/app/react-three-controller/controls/ControlsProvider";

import { CrashcatRuntime } from "@/app/components/CrashcatRuntime";
import CrashcatPhysics from "@/app/components/CrashcatPhysics";
import ElevatorMover from "./components/ElevatorMover";
import OrbMover from "./components/OrbMover";

import FirstPersonPlayer, { type FirstPersonPlayerRef } from "./FirstPersonPlayer";

import killbox from "@public/samples/killbox.json";
import RenderPipeline from "@/shared/shaders/PostProcessingEffects";

registerComponent(CrashcatPhysics);
registerComponent(ElevatorMover);
registerComponent(OrbMover);

export default function Home() {
    const playerRef = useRef<FirstPersonPlayerRef>(null);

    return (
        <main className="flex h-screen w-screen flex-col items-center justify-between bg-white dark:bg-black sm:items-start">
            <Controls>
                <GameCanvas>
                    <PrefabRoot data={killbox}>
                        <CrashcatRuntime>
                            <FirstPersonPlayer ref={playerRef} />
                        </CrashcatRuntime>
                        <RenderPipeline />
                    </PrefabRoot>
                </GameCanvas>
            </Controls>
        </main>
    );
}