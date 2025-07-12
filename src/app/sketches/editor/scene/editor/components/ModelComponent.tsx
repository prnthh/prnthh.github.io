import React from "react";
import { SceneNode } from "../SceneViewer";
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
                            ? { ...compItem, noInstance: e.target.checked }
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

    const noInstance = comp.noInstance !== undefined ? comp.noInstance : false;

    return (
        <li style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Model</span>
            <div style={{ marginTop: 4, marginLeft: 8 }}>
                <div>
                    <label style={{ marginRight: 4 }}>Type:</label>
                    <span>{comp.type || 'Unknown'}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                    <label style={{ marginRight: 4 }}>Select Model:</label>
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
                <div style={{ marginTop: 8 }}>
                    <label>
                        <input
                            type="checkbox"
                            checked={noInstance}
                            onChange={handleInstanceChange}
                        />
                        <span style={{ marginLeft: 4 }}>No Instance</span>
                    </label>
                </div>
            </div>
        </li>
    );
}
