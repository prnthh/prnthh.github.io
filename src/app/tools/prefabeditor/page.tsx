"use client";

import React, { useEffect, useState } from "react";
import { Leva } from "leva";
import { Prefab, PrefabEditor, registerComponent } from "react-three-game";
import RotatorComponent from "./plugins/RotatorComponent";
import RenderPipeline from "@/shared/shaders/PostProcessingEffects";

registerComponent(RotatorComponent);

const SAMPLE_NAMES = ["killbox", "killbox2", "killboxlobby", "room", "room2", "scummworld"] as const;
const DEFAULT_SAMPLE = "killbox";

type SampleName = typeof SAMPLE_NAMES[number];

async function loadSample(name: SampleName) {
    const module = await import(`./samples/${name}.json`);
    return module.default as Prefab;
}

export const Toolbar = ({ setSelectedPrefab }: { setSelectedPrefab: React.Dispatch<React.SetStateAction<Prefab | null>> }) => {
    return <select
        className="bg-white px-2 py-1 text-black"
        defaultValue={DEFAULT_SAMPLE}
        onChange={(e) => {
            void loadSample(e.target.value as SampleName).then((prefab) => {
                setSelectedPrefab(prefab);
            });
        }}
    >
        {SAMPLE_NAMES.map((prefabName) => (
            <option key={prefabName} value={prefabName}>{prefabName} prefab</option>
        ))}
    </select>
}

export default function PrefabEditorPage() {
    const [selectedPrefab, setSelectedPrefab] = useState<Prefab | null>(null);

    useEffect(() => {
        let cancelled = false;

        setSelectedPrefab(null);

        loadSample(DEFAULT_SAMPLE)
            .then(prefab => {
                if (cancelled) {
                    return;
                }

                setSelectedPrefab(prefab);
            })
            .catch(error => {
                if (cancelled) {
                    return;
                }

                console.error(`Failed to load prefab sample: ${DEFAULT_SAMPLE}`, error);
                setSelectedPrefab(null);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return <div className="relative w-screen h-screen">
        <Leva collapsed oneLineLabels />
        {selectedPrefab ? (
            <PrefabEditor uiPlugins={<Toolbar setSelectedPrefab={setSelectedPrefab} />} initialPrefab={selectedPrefab}>
                <RenderPipeline />
            </PrefabEditor>
        ) : (
            <div className="flex h-full items-center justify-center bg-black text-sm uppercase tracking-[0.12em] text-white">
                Loading sample...
            </div>
        )}
    </div>
}
