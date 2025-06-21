import React, { useState } from "react";
import useECSStore, { ECS_COMPONENTS } from "../EditorContext";

const ALL_COMPONENTS = Object.keys(ECS_COMPONENTS).concat(["Object3D", "mesh"]);

function EntityDetails() {
    const { entities, selectedEntity, removeComponent, addComponent } = useECSStore();
    const [addDropdownOpen, setAddDropdownOpen] = useState(false);
    const [newComponent, setNewComponent] = useState<string>("");
    if (selectedEntity === null) {
        return (
            <div className="bg-slate-800/20 rounded p-2 mt-2 text-sm text-slate-200">
                <b>Entity Details</b>
                <div className="text-slate-400">No entity selected.</div>
            </div>
        );
    }
    const entity = entities.get(selectedEntity);
    if (!entity) {
        return (
            <div className="bg-slate-800/20 rounded p-2 mt-2 text-sm text-slate-200">
                <b>Entity Details</b>
                <div className="text-slate-400">No entity selected.</div>
            </div>
        );
    }
    const componentsObj = Object.fromEntries(entity.components.entries());
    // Helper to render Object3D section
    const renderObject3D = (object3DComp: any) => {
        if (!object3DComp) return null;
        const { object3D, meshRef } = object3DComp;
        return (
            <div className="mb-2">
                <div className="font-semibold text-slate-300">Object3D</div>
                {object3D && (
                    <pre className="bg-slate-900/40 p-2 rounded text-xs overflow-auto mb-1 max-h-40">
                        {JSON.stringify(object3D, null, 2)}
                    </pre>
                )}
                {meshRef && (
                    <details className="mb-1">
                        <summary className="cursor-pointer text-slate-400">meshRef</summary>
                        <pre className="bg-slate-900/40 p-2 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(meshRef, null, 2)}
                        </pre>
                    </details>
                )}
            </div>
        );
    };
    // Helper to render each component
    const renderComponents = (components: any) => {
        return Object.entries(components).map(([name, comp]) => {
            if (name === 'Object3D') return null; // Already rendered
            return (
                <details key={name} className="mb-2">
                    <summary className="flex items-center justify-between cursor-pointer font-semibold text-slate-300">
                        <span>{name}</span>
                        <button
                            className="ml-2 px-1 py-0.5 text-xs bg-red-700 hover:bg-red-800 rounded text-white"
                            title={`Delete ${name}`}
                            onClick={e => {
                                e.stopPropagation();
                                removeComponent(selectedEntity, name);
                            }}
                        >
                            Delete
                        </button>
                    </summary>
                    <pre className="bg-slate-900/40 p-2 rounded text-xs overflow-auto max-h-40 mt-1">
                        {JSON.stringify(comp, null, 2)}
                    </pre>
                </details>
            );
        });
    };
    // Compute available components to add
    const present = Object.keys(componentsObj);
    const available = ALL_COMPONENTS.filter(c => !present.includes(c));
    return (
        <div className="bg-slate-800/20 rounded p-2 mt-2 text-sm text-slate-200 max-w-[400px]">
            <b>Entity Details (ID: {entity.id})</b>
            <div className="mt-2">
                <div className="mb-2">
                    <span className="font-semibold text-slate-300">Entity</span>
                    <pre className="bg-slate-900/40 p-2 rounded text-xs overflow-auto max-h-20 mb-1">{JSON.stringify({ id: entity.id }, null, 2)}</pre>
                </div>
                {renderObject3D(componentsObj.Object3D)}
                {renderComponents(componentsObj)}
                <div className="mt-4">
                    <button
                        className="px-2 py-1 rounded bg-green-700 hover:bg-green-800 text-white text-xs"
                        onClick={() => setAddDropdownOpen(v => !v)}
                    >
                        + Add Component
                    </button>
                    {addDropdownOpen && (
                        <div className="mt-2 flex gap-2 items-center">
                            <select
                                className="bg-slate-900/80 text-slate-200 rounded px-2 py-1 text-xs"
                                value={newComponent}
                                onChange={e => setNewComponent(e.target.value)}
                            >
                                <option value="">Select component...</option>
                                {available.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <button
                                className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs"
                                disabled={!newComponent}
                                onClick={() => {
                                    if (newComponent) {
                                        addComponent(selectedEntity, newComponent, {});
                                        setNewComponent("");
                                        setAddDropdownOpen(false);
                                    }
                                }}
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EntityDetails;
