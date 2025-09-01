import React, { useState } from "react";
import { removeNodeById } from "./SceneEditor";
import { MaterialComponent } from "./components/MaterialComponent";
import { GeometryComponent } from "./components/GeometryComponent";
import { TransformComponent } from "./components/TransformComponent";
import { ModelComponent } from "./components/ModelComponent";
import { PhysicsComponent } from "./components/PhysicsComponent";
import { PointerEventComponent } from "./components/PointerEventComponent";
import { SceneNode } from "../viewer/SceneViewer";
import { WaterMaterialComponent } from "./components/WaterMaterialComponent";

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
        type: 'waterM<aterial',
        label: 'Water Material',
        default: { type: 'waterMaterial', props: { color: 'aqua', distortionScale: 3, size: 1 } },
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
    },
    {
        type: 'pointerEvent',
        label: 'Pointer Event',
        default: { type: 'pointerEvent' },
    }
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
    if (comp.type === 'waterMaterial') {
        return <WaterMaterialComponent node={node} setSceneGraph={setSceneGraph} />;
    }
    // Use ModelComponent for model
    if (comp.type === 'model') {
        return <ModelComponent node={node} models={models} setSceneGraph={setSceneGraph} />;
    }
    // Use PhysicsComponent for physics
    if (comp.type === 'physics') {
        return <PhysicsComponent node={node} setSceneGraph={setSceneGraph} />;
    }
    // Use PointerEventComponent for pointerEvent
    if (comp.type === 'pointerEvent') {
        return <PointerEventComponent node={node} setSceneGraph={setSceneGraph} />;
    }

    const compType = getComponentType(comp.type);
    if (!compType) return null;
    return (
        <div className="mb-2 flex items-center justify-between">
            <span>
                <span className="font-medium">{compType.label || comp.type}</span>
                {comp.args && <span> args: {JSON.stringify(comp.args)}</span>}
            </span>
            <button onClick={handleRemoveComponent} className="ml-2 text-red-500 font-bold bg-transparent border-none cursor-pointer" title="Remove Component">✕</button>
        </div>
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
    if (!node) return <div className="absolute top-4 right-4 rounded">No node selected</div>;

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

    return <div className="absolute top-4 right-4 bg-stone-200/50 p-2 shadow border-stone-700 border">
        <div className="flex items-center justify-between">
            {editingName ? (
                <input
                    autoFocus
                    value={nameInput}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    onKeyDown={handleNameKeyDown}
                    className="font-bold text-base flex-1 mr-2"
                />
            ) : (
                <b onDoubleClick={handleNameDoubleClick} className="cursor-pointer" title="Double click to rename">{node.name}</b>
            )}
            <button onClick={handleDeleteNode} className="ml-2 text-red-500 font-bold bg-transparent border-none cursor-pointer" title="Delete Node">✕</button>
        </div>
        <TransformComponent node={node} setSceneGraph={setSceneGraph} />
        {/* Show components */}
        <div className="mt-4">
            <b>Components</b>
            {node.components && node.components.length > 0 ? (
                <>
                    {node.components.map((comp, idx) => (
                        <div key={idx}>
                            <div className="w-full h-px bg-stone-700 mt-2" />
                            <ComponentEditor comp={comp} idx={idx} node={node} setSceneGraph={setSceneGraph} models={models} />
                        </div>
                    ))}
                </>
            ) : (
                <div className="text-gray-500 text-xs">No components</div>
            )}
        </div>
        <div className="mt-4">
            <button onClick={() => setAddMenuOpen(v => !v)} className="w-full">Add Component</button>
            {addMenuOpen && (
                <div className="bg-gray-800 text-white rounded mt-1 z-10 relative">
                    {COMPONENT_TYPES.map(c => (
                        <button key={c.type} className="block w-full" onClick={() => handleAddComponent(c.type)}>{c.label}</button>
                    ))}
                    <button className="block w-full text-gray-400" onClick={() => setAddMenuOpen(false)}>Cancel</button>
                </div>
            )}
        </div>
    </div>;
}