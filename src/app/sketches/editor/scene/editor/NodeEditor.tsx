import React, { useState } from "react";
import { removeNodeById, SceneNode } from "./SceneEditor";
import { MaterialComponent } from "./components/MaterialComponent";
import { GeometryComponent } from "./components/GeometryComponent";
import { TransformComponent } from "./components/TransformComponent";
import { ModelComponent } from "./components/ModelComponent";

interface EditorAppProps {
    selectedId: string | null;
    sceneGraph: SceneNode[];
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
    setSelectedNodeId?: React.Dispatch<React.SetStateAction<string | null>>;
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
};
function ComponentEditor({ comp, idx, node, setSceneGraph }: ComponentEditorProps) {
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
        return <ModelComponent node={node} />;
    }

    const compType = getComponentType(comp.type);
    if (!compType) return null;
    return (
        <li style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
                <span style={{ fontWeight: 500 }}>{compType.label || comp.type}</span>
                {comp.args && <span> args: {JSON.stringify(comp.args)}</span>}
            </span>
            <button onClick={handleRemoveComponent} style={{ marginLeft: 8, color: 'red', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }} title="Remove Component">✕</button>
        </li>
    );
}

export default function NodeEditor({ selectedId, sceneGraph, setSceneGraph, setSelectedNodeId }: EditorAppProps) {
    const [addMenuOpen, setAddMenuOpen] = useState(false);

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
        if (setSelectedNodeId) setSelectedNodeId(null);
    };

    // Handler to add a component
    const handleAddComponent = (type: string) => {
        const compType = getComponentType(type);
        if (!compType) return;
        setSceneGraph((prev: SceneNode[]) => {
            function update(nodes: SceneNode[]): SceneNode[] {
                return nodes.map((n: SceneNode) => {
                    if (n.id === node?.id) {
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
    return <div className="absolute top-4 right-4 rounded bg-white p-4 shadow">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <b>{node.name}</b>
            <button onClick={handleDeleteNode} style={{ marginLeft: 8, color: 'red', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }} title="Delete Node">✕</button>
        </div>
        <TransformComponent node={node} setSceneGraph={setSceneGraph} />
        {/* Show components */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
            <b>Components</b>
            {node.components && node.components.length > 0 ? (
                <ul style={{ paddingLeft: 16 }}>
                    {node.components.map((comp, idx) => (
                        <ComponentEditor key={idx} comp={comp} idx={idx} node={node} setSceneGraph={setSceneGraph} />
                    ))}
                </ul>
            ) : (
                <div style={{ color: '#888', fontSize: 12 }}>No components</div>
            )}
        </div>
        <div style={{ marginTop: 16 }}>
            <button onClick={() => setAddMenuOpen(v => !v)} style={{ width: '100%' }}>Add Component</button>
            {addMenuOpen && (
                <div style={{ background: '#222', color: '#fff', borderRadius: 4, marginTop: 4, zIndex: 10, position: 'relative' }}>
                    {COMPONENT_TYPES.map(c => (
                        <button key={c.type} style={{ display: 'block', width: '100%' }} onClick={() => handleAddComponent(c.type)}>{c.label}</button>
                    ))}
                    <button style={{ display: 'block', width: '100%', color: '#888' }} onClick={() => setAddMenuOpen(false)}>Cancel</button>
                </div>
            )}
        </div>
    </div>;
}