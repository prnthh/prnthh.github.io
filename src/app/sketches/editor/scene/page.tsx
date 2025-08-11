"use client";

import { Physics } from "@react-three/rapier";
import { GameCanvas } from "@/shared/GameCanvas";
import { DragDropLoader } from "../dragdrop/DragDropLoader";
import React, { useEffect, useRef, useState, useContext, createContext } from "react";
import { Environment } from "@react-three/drei";
import { EditorModes, SceneNode, Viewer } from "./viewer/SceneViewer";
import { Perf } from 'r3f-perf'
import { CharacterController } from "../../controllers/shouldercam/CharacterController";
import Controls from "@/shared/ControlsProvider";
import presets from "./presets";
import { GameEngine } from "./editor/EditorContext";


export default function EditorApp() {
    const [editorMode, setEditorMode] = useState<EditorModes>(EditorModes.Edit);
    return <>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50">
            <button onClick={() => setEditorMode(prev => prev === EditorModes.Edit ? EditorModes.Play : EditorModes.Edit)}>
                {editorMode === EditorModes.Edit ? "▶️" : "⏹️"}
            </button>
        </div>
        <Controls>

            <GameEngine mode={editorMode} sceneGraph={presets.drive as unknown as SceneNode[]}>
                <GameCanvas>
                    <Physics paused={editorMode !== EditorModes.Play}>
                        {editorMode === EditorModes.Play ? <>
                            <CharacterController />
                        </> : null}

                        <Viewer />

                        <ambientLight intensity={0.5} />
                        <Environment files="/textures/skybox3.jpg" background={true} />
                        <Perf position="bottom-right" />
                    </Physics>
                </GameCanvas>
            </GameEngine>
        </Controls>
    </>
}