"use client";

import { Physics } from "@react-three/rapier";
import React, { useState, } from "react";
import { Environment } from "@react-three/drei";
import { EditorModes, SceneNode, Viewer } from "./viewer/SceneViewer";
import presets from "./presets";
import { GameEngine, useEditorContext } from "./editor/EditorContext";
import GameCanvas from "@/shared/GameCanvas";

function PhysicsWrapper({ editorMode, children }: { editorMode: EditorModes, children: React.ReactNode }) {
    const { isLoadingAssets } = useEditorContext();
    const isPaused = editorMode !== EditorModes.Play || isLoadingAssets;

    return (
        <Physics paused={isPaused}>
            {children}
        </Physics>
    );
}

export default function EditorApp() {
    const [editorMode, setEditorMode] = useState<EditorModes>(EditorModes.Edit);
    return <>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50">
            <button onClick={() => setEditorMode(prev => prev === EditorModes.Edit ? EditorModes.Play : EditorModes.Edit)}>
                {editorMode === EditorModes.Edit ? "▶️" : "⏹️"}
            </button>
        </div>

        <GameEngine mode={editorMode} sceneGraph={presets.drive as any[]}>
            <GameCanvas>
                <PhysicsWrapper editorMode={editorMode}>
                    {editorMode === EditorModes.Play ? <>
                    </> : null}

                    <Viewer />

                    <ambientLight intensity={1.5} />
                    <Environment preset="sunset" background={false} />
                </PhysicsWrapper>
            </GameCanvas>
        </GameEngine>
    </>
}