import React from "react";
import { SceneNode } from "../../viewer/SceneViewer";
import { updateSceneGraphNodeAndComponent } from "./TransformComponent";

// --- ModelComponent for model component ---
export function ModelComponent({ node, models, setSceneGraph }: {
    node: SceneNode;
    models: { [filename: string]: any };
    setSceneGraph?: React.Dispatch<React.SetStateAction<SceneNode[]>>;
}) {
    // Find the model component
    const idx = node.components?.findIndex((c: any) => c.type === 'model');
    if (idx === undefined || idx === -1) return null;
    const comp = node.components[idx];

    // Handler to change model filename
    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const filename = e.target.value;
        if (!setSceneGraph) return;
        setSceneGraph(prev =>
            updateSceneGraphNodeAndComponent(
                prev,
                node.id,
                idx,
                (n, c) => ({
                    ...n,
                    components: n.components.map((compItem: any, cidx: number) =>
                        cidx === idx
                            ? { ...compItem, filename }
                            : compItem
                    )
                })
            )
        );
    };

    // Handler to toggle instance property
    const handleInstanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!setSceneGraph) return;
        setSceneGraph(prev =>
            updateSceneGraphNodeAndComponent(
                prev,
                node.id,
                idx,
                (n, c) => ({
                    ...n,
                    components: n.components.map((compItem: any, cidx: number) =>
                        cidx === idx
                            ? { ...compItem, instanced: e.target.checked }
                            : compItem
                    )
                })
            )
        );
    };

    const availableModelFilenames = Object.keys(models).filter(fn => models[fn]);
    const selectedFilename = availableModelFilenames.includes(comp.filename)
        ? comp.filename
        : "";

    const instanced = comp.instanced !== undefined ? comp.instanced : false;

    return (
        <li className="mb-1 py-1 px-2 bg-white/5 border border-white/10">
            <span className="text-white/90 text-xs font-medium block mb-1">Model</span>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <label className="text-white/60 text-xs min-w-[35px]">Type:</label>
                    <span className="text-white/80 text-xs font-mono">{comp.type || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-white/60 text-xs min-w-[35px]">Model:</label>
                    <select
                        value={selectedFilename}
                        onChange={handleModelChange}
                        className="flex-1 bg-white/10 border border-white/20 text-white/90 text-xs px-2 py-1 focus:outline-none focus:border-white/40 transition-colors"
                    >
                        <option value="" disabled>Select model...</option>
                        {availableModelFilenames.map(filename => (
                            <option key={filename} value={filename} className="bg-gray-800 text-white">
                                {filename}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-white/70 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={instanced}
                            onChange={handleInstanceChange}
                            className="w-3 h-3 border border-white/30 bg-white/10 text-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <span>Instanced</span>
                    </label>
                </div>
            </div>
        </li>
    );
}
