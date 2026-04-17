"use client";

import React, { useEffect, useRef, useState } from "react";
import { Prefab, PrefabEditor, PrefabEditorRef, registerComponent } from "react-three-game";
import AgenticEditor from "./AgenticEditor";
import RotatorComponent from "./plugins/RotatorComponent";
import HumanoidModelComponent from "./plugins/HumanoidModelComponent";
import { PCFSoftShadowMap } from "three";

registerComponent(RotatorComponent);
registerComponent(HumanoidModelComponent);

const SAMPLE_NAMES = ["killbox", "killbox2", "killboxlobby", "room", "room2", "scummworld"] as const;
const DEFAULT_SAMPLE = "killbox";

type SampleName = typeof SAMPLE_NAMES[number];

async function loadSample(name: SampleName) {
    const response = await fetch(`/samples/${name}.json`);

    if (!response.ok) {
        throw new Error(`Failed to load sample ${name}: ${response.status} ${response.statusText}`);
    }

    return await response.json() as Prefab;
}

export const Toolbar = ({ onSelectPrefab }: { onSelectPrefab: (prefab: Prefab) => void }) => {
    return <select
        className="bg-white px-2 py-1 text-black"
        defaultValue={DEFAULT_SAMPLE}
        onChange={(e) => {
            void loadSample(e.target.value as SampleName).then((prefab) => {
                onSelectPrefab(prefab);
            });
        }}
    >
        {SAMPLE_NAMES.map((prefabName) => (
            <option key={prefabName} value={prefabName}>{prefabName} prefab</option>
        ))}
    </select>
}

export default function PrefabEditorPage() {
    const [loadedPrefab, setLoadedPrefab] = useState<Prefab | null>(null);
    const [livePrefab, setLivePrefab] = useState<Prefab | null>(null);
    const editorRef = useRef<PrefabEditorRef | null>(null);

    const handleSelectPrefab = (prefab: Prefab) => {
        setLoadedPrefab(prefab);
        setLivePrefab(prefab);
        editorRef.current?.load(prefab, { resetHistory: true, notifyChange: true });
    };

    useEffect(() => {
        let cancelled = false;

        setLoadedPrefab(null);
        setLivePrefab(null);

        loadSample(DEFAULT_SAMPLE)
            .then(prefab => {
                if (cancelled) {
                    return;
                }

                setLoadedPrefab(prefab);
                setLivePrefab(prefab);
            })
            .catch(error => {
                if (cancelled) {
                    return;
                }

                console.error(`Failed to load prefab sample: ${DEFAULT_SAMPLE}`, error);
                setLoadedPrefab(null);
                setLivePrefab(null);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return <div className="relative w-screen h-screen">
        {loadedPrefab ? (
            <>
                <PrefabEditor
                    ref={editorRef}
                    canvasProps={{ shadows: { type: PCFSoftShadowMap } }}
                    uiPlugins={<Toolbar onSelectPrefab={handleSelectPrefab} />}
                    initialPrefab={loadedPrefab}
                    onChange={setLivePrefab}
                />
                <AgenticEditor editorRef={editorRef} prefab={livePrefab} />
            </>
        ) : (
            <div className="flex h-full items-center justify-center bg-black text-sm uppercase tracking-[0.12em] text-white">
                Loading sample...
            </div>
        )}
    </div >
}
