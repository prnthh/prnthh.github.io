import React, { useState } from "react";
import { removeNodeById } from "./SceneEditor";
import { MaterialComponent } from "./components/MaterialComponent";
import { GeometryComponent } from "./components/GeometryComponent";
import { TransformComponent } from "./components/TransformComponent";
import { ModelComponent } from "./components/ModelComponent";
import { PhysicsComponent } from "./components/PhysicsComponent";
import { SceneNode } from "../viewer/SceneViewer";

interface EditorAppProps {
    selectedId: string | null;
    sceneGraph: SceneNode[];
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
    setSelectedNodeId?: React.Dispatch<React.SetStateAction<string | null>>;
    models: { [filename: string]: any };
}

// --- Component Registry ---
const COMPONENT_TYPES = [
    {
        type: 'boxGeometry',
        label: 'Box Geometry',
        default: { type: 'boxGeometry', args: [1, 1, 1] },
    },
    {
        type: 'meshStandardMaterial',
        label: 'Mesh Standard Material',
        default: { type: 'meshStandardMaterial', props: { color: 'blue' } },
    },
    {
        type: 'model',
        label: 'GLB Model',
        default: { type: 'model', src: '', scale: 1 },
    },
    {
        type: 'physics',
        label: 'Physics',
        default: { type: 'physics', props: { type: 'fixed' } },
    }
    // Add more component types here
];

type ComponentTypeDef = {
    type: string;
    label: string;
    default: any;
};

function getComponentType(type: string): ComponentTypeDef | undefined {
    return COMPONENT_TYPES.find(c => c.type === type);
}

// --- Component Editor ---
type ComponentEditorProps = {
    comp: any;
    idx: number;
    node: SceneNode;
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
    models: { [filename: string]: any };
};
function ComponentEditor({ comp, idx, node, setSceneGraph, models }: ComponentEditorProps) {
    // Remove component handler
    const handleRemoveComponent = () => {
        setSceneGraph(prev => {
            function update(nodes: SceneNode[]): SceneNode[] {
                return nodes.map(n => {
                    if (n.id === node.id) {
                        const newComponents = n.components.filter((_: any, i: number) => i !== idx);
                        return { ...n, components: newComponents };
                    }
                    return { ...n, children: update(n.children) };
                });
            }
            return update(prev);
        });
    };
    // Use GeometryComponent for boxGeometry
    if (comp.type === 'boxGeometry') {
        return <GeometryComponent node={node} setSceneGraph={setSceneGraph} />;
    }
    // Use MaterialComponent for meshStandardMaterial
    if (comp.type === 'meshStandardMaterial') {
        return <MaterialComponent node={node} setSceneGraph={setSceneGraph} />;
    }
    // Use ModelComponent for model
    if (comp.type === 'model') {
        return <ModelComponent node={node} models={models} setSceneGraph={setSceneGraph} />;
    }
    // Use PhysicsComponent for physics
    if (comp.type === 'physics') {
        return <PhysicsComponent node={node} setSceneGraph={setSceneGraph} />;
    }

    const compType = getComponentType(comp.type);
    if (!compType) return null;
    return (
        <li className="mb-1 flex items-center justify-between py-1 px-2 bg-white/5 border border-white/10">
            <span className="text-white/80 text-xs">
                <span className="font-medium text-white/90">{compType.label || comp.type}</span>
                {comp.args && <span className="text-white/60 font-mono ml-2">args: {JSON.stringify(comp.args)}</span>}
            </span>
            <button
                onClick={handleRemoveComponent}
                className="w-5 h-5 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-xs"
                title="Remove Component"
            >
                ✕
            </button>
        </li>
    );
}

export default function NodeEditor({ selectedId, sceneGraph, setSceneGraph, setSelectedNodeId, models }: EditorAppProps) {
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState("");

    // Helper to find node by id
    function findNode(nodes: SceneNode[], id: string | null): SceneNode | null {
        if (!id) return null;
        for (const node of nodes) {
            if (node.id === id) return node;
            const found = findNode(node.children, id);
            if (found) return found;
        }
        return null;
    }
    const node = findNode(sceneGraph, selectedId);
    if (!node) return <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md border border-white/10 p-2 text-white/60 text-xs">No node selected</div>;

    // Handler to delete node
    const handleDeleteNode = () => {
        if (!node.id) return;
        setSceneGraph(prev => {
            const [newGraph] = removeNodeById(prev, node.id);
            return newGraph;
        });
    };

    // Handler to add a component
    const handleAddComponent = (type: string) => {
        const compType = getComponentType(type);
        if (!compType) return;
        setSceneGraph((prev: SceneNode[]) => {
            function update(nodes: SceneNode[]): SceneNode[] {
                return nodes.map((n: SceneNode) => {
                    if (node && n.id === node.id) {
                        const newComponents = n.components ? [...n.components] : [];
                        newComponents.push(JSON.parse(JSON.stringify(compType?.default)));
                        return { ...n, components: newComponents };
                    }
                    return { ...n, children: update(n.children) };
                });
            }
            return update(prev);
        });
        setAddMenuOpen(false);
    };

    // --- Name editing handlers ---
    const handleNameDoubleClick = () => {
        setNameInput(node.name || "");
        setEditingName(true);
    };
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNameInput(e.target.value);
    };
    const commitNameChange = () => {
        if (nameInput.trim() && nameInput !== node.name) {
            setSceneGraph(prev => {
                function update(nodes: SceneNode[]): SceneNode[] {
                    return nodes.map(n => {
                        if (node && n.id === node.id) {
                            return { ...n, name: nameInput };
                        }
                        return { ...n, children: update(n.children) };
                    });
                }
                return update(prev);
            });
        }
        setEditingName(false);
    };
    const handleNameBlur = () => {
        commitNameChange();
    };
    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            commitNameChange();
        } else if (e.key === "Escape") {
            setEditingName(false);
        }
    };

    return <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md border border-white/10 p-3 shadow-2xl min-w-[320px]">
        <div className="flex items-center justify-between mb-3">
            {editingName ? (
                <input
                    autoFocus
                    value={nameInput}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    onKeyDown={handleNameKeyDown}
                    className="flex-1 mr-2 bg-transparent border-b border-white/30 focus:border-white/60 text-white/90 text-sm font-medium outline-none transition-colors"
                />
            ) : (
                <h3
                    onDoubleClick={handleNameDoubleClick}
                    className="cursor-pointer text-white/90 text-sm font-medium hover:text-white transition-colors select-none"
                    title="Double click to rename"
                >
                    {node.name}
                </h3>
            )}
            <button
                onClick={handleDeleteNode}
                className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm"
                title="Delete Node"
            >
                ✕
            </button>
        </div>
        <TransformComponent node={node} setSceneGraph={setSceneGraph} />
        {/* Show components */}
        <div className="mt-3 mb-2">
            <div className="text-white/70 text-xs font-medium mb-2 tracking-wider uppercase">Components</div>
            {node.components && node.components.length > 0 ? (
                <ul className="space-y-1">
                    {node.components.map((comp, idx) => (
                        <ComponentEditor key={idx} comp={comp} idx={idx} node={node} setSceneGraph={setSceneGraph} models={models} />
                    ))}
                </ul>
            ) : (
                <div className="text-white/40 text-xs">No components</div>
            )}
        </div>
        <div className="mt-3">
            <button
                onClick={() => setAddMenuOpen(v => !v)}
                className="w-full py-1 px-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white/80 hover:text-white/90 text-xs font-medium transition-all"
            >
                Add Component
            </button>
            {addMenuOpen && (
                <div className="bg-black/90 backdrop-blur-md border border-white/20 mt-1 z-10 relative overflow-hidden shadow-xl">
                    {COMPONENT_TYPES.map(c => (
                        <button
                            key={c.type}
                            className="block w-full py-1 px-2 text-left text-white/80 hover:text-white hover:bg-white/10 text-xs transition-all border-b border-white/5 last:border-b-0"
                            onClick={() => handleAddComponent(c.type)}
                        >
                            {c.label}
                        </button>
                    ))}
                    <button
                        className="block w-full py-1 px-2 text-left text-white/40 hover:text-white/60 hover:bg-white/5 text-xs transition-all"
                        onClick={() => setAddMenuOpen(false)}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    </div>;
}