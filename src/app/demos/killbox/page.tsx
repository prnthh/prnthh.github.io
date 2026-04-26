"use client";

import { useEffect, useRef } from "react";
import { PrefabEditor, PrefabEditorMode, registerComponent, useScene } from "react-three-game";
import type { Prefab, PrefabEditorRef } from "react-three-game";
import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import { useControls } from "@/app/react-three-controller/controls/ControlsProvider";

import { CrashcatRuntime } from "@/app/components/CrashcatRuntime";
import CrashcatPhysics from "@/app/components/CrashcatPhysics";
import ElevatorMover from "./components/ElevatorMover";
import OrbMover from "./components/OrbMover";

import FirstPersonPlayer, { type FirstPersonPlayerRef } from "./FirstPersonPlayer";

import initialWorld from "@public/samples/killbox.json";
import RenderPipeline from "@/shared/shaders/PostProcessingEffects";

registerComponent(CrashcatPhysics);
registerComponent(ElevatorMover);
registerComponent(OrbMover);

function ControlModeSync() {
    const scene = useScene();
    const { setEnabled } = useControls();

    useEffect(() => {
        setEnabled(scene.mode === PrefabEditorMode.Play);
        return () => {
            setEnabled(true);
        };
    }, [scene.mode, setEnabled]);

    return null;
}

export default function Home() {
    const editorRef = useRef<PrefabEditorRef>(null);
    const playerRef = useRef<FirstPersonPlayerRef>(null);

    return (
        <main className="flex h-screen w-screen flex-col items-center justify-between bg-white dark:bg-black sm:items-start">
            <Controls>
                <PrefabEditor mode={PrefabEditorMode.Play} ref={editorRef} initialPrefab={initialWorld as Prefab}>
                    <ControlModeSync />
                    <CrashcatRuntime>
                        <FirstPersonPlayer ref={playerRef} />
                    </CrashcatRuntime>
                    <RenderPipeline />
                </PrefabEditor>
            </Controls>
        </main>
    );
}