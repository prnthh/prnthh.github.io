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
        <div className="mb-2">
            <span className="font-medium">Model</span>
            <div className="mt-1 ml-2">
                <div>
                    <label className="mr-1">Type:</label>
                    <span>{comp.type || 'Unknown'}</span>
                </div>
                <div className="mt-2">
                    <label className="mr-1">Select Model:</label>
                    <select
                        value={selectedFilename}
                        onChange={handleModelChange}
                        style={{ minWidth: 120 }}
                    >
                        <option value="" disabled>Select model...</option>
                        {availableModelFilenames.map(filename => (
                            <option key={filename} value={filename}>
                                {filename}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mt-2">
                    <label>
                        <input
                            type="checkbox"
                            checked={instanced}
                            onChange={handleInstanceChange}
                        />
                        <span className="ml-1">Instanced</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
