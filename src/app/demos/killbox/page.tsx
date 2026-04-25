"use client";

import { useRef } from "react";
import { PrefabEditor, PrefabEditorMode, registerComponent } from "react-three-game";
import type { Prefab, PrefabEditorRef } from "react-three-game";
import Controls from "@/app/react-three-controller/controls/ControlsProvider";

import { CrashcatRuntime, type CrashcatRuntimeRef } from "@/app/components/CrashcatRuntime";
import CrashcatPhysics from "./CrashcatPhysics";
import FirstPersonPlayer, { type FirstPersonPlayerRef } from "./FirstPersonPlayer";
import ElevatorMover from "./ElevatorMover";
import OrbMover from "./OrbMover";

import initialWorld from "@public/samples/killbox.json";
import RenderPipeline from "@/shared/shaders/PostProcessingEffects";

registerComponent(CrashcatPhysics);
registerComponent(ElevatorMover);
registerComponent(OrbMover);

export default function Home() {
    const editorRef = useRef<PrefabEditorRef>(null);
    const runtimeRef = useRef<CrashcatRuntimeRef>(null);
    const playerRef = useRef<FirstPersonPlayerRef>(null);

    return (
        <main className="flex h-screen w-screen flex-col items-center justify-between bg-white dark:bg-black sm:items-start">
            <Controls>
                <PrefabEditor mode={PrefabEditorMode.Play} ref={editorRef} initialPrefab={initialWorld as Prefab}>
                    <FirstPersonPlayer ref={playerRef} runtimeRef={runtimeRef} />
                    <CrashcatRuntime ref={runtimeRef} editorRef={editorRef} debug />
                    <RenderPipeline />
                </PrefabEditor>
            </Controls>
        </main>
    );
}