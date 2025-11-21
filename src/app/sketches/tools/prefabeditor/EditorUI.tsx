import { Dispatch, SetStateAction, useState } from 'react';
import { Prefab, GameObject as GameObjectType, COMPONENT_DEFS } from "./types";
import ComponentEditors from './components';


function EditorUI({ prefabData, setPrefabData, selectedId, setSelectedId, transformMode, setTransformMode }: {
    prefabData?: Prefab;
    setPrefabData?: Dispatch<SetStateAction<Prefab>>;
    selectedId: string | null;
    setSelectedId: Dispatch<SetStateAction<string | null>>;
    transformMode: "translate" | "rotate" | "scale";
    setTransformMode: (m: "translate" | "rotate" | "scale") => void;
}) {
    const updateNode = (updater: (n: GameObjectType) => GameObjectType) => {
        if (!prefabData || !setPrefabData || !selectedId) return;
        setPrefabData(prev => ({
            ...prev,
            root: updatePrefabNode(prev.root, selectedId, updater)
        }));
    };

    const deleteNode = () => {
        if (!prefabData || !setPrefabData || !selectedId) return;
        if (selectedId === prefabData.root.id) {
            alert("Cannot delete root node");
            return;
        }
        setPrefabData(prev => {
            const newRoot = deletePrefabNode(prev.root, selectedId);
            return { ...prev, root: newRoot! };
        });
        setSelectedId(null);
    };

    const selectedNode = selectedId && prefabData ? findNode(prefabData.root, selectedId) : null;

    if (!selectedNode) return null;
    return (
        <div className='absolute top-4 right-4 z-20 bg-gray-800 text-white p-4 rounded shadow-lg w-80 max-h-[90vh] overflow-y-auto'>
            <NodeInspector
                node={selectedNode}
                updateNode={updateNode}
                deleteNode={deleteNode}
                transformMode={transformMode}
                setTransformMode={setTransformMode}
            />
        </div>
    );
}

function NodeInspector({ node, updateNode, deleteNode, transformMode, setTransformMode }: {
    node: GameObjectType;
    updateNode: (updater: (n: GameObjectType) => GameObjectType) => void;
    deleteNode: () => void;
    transformMode: "translate" | "rotate" | "scale";
    setTransformMode: (m: "translate" | "rotate" | "scale") => void;
}) {
    const [addComponentType, setAddComponentType] = useState(Object.keys(COMPONENT_DEFS)[0]);

    return <div className="flex flex-col gap-4">
        <div>
            <label className="block text-xs text-gray-400 mb-1">ID</label>
            <input
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                value={node.id}
                onChange={e => updateNode(n => ({ ...n, id: e.target.value }))}
            />
        </div>

        <div className="flex justify-between items-center">
            <label className="text-sm font-bold">Node Actions</label>
            <button onClick={deleteNode} className="p-1">❌</button>
        </div>

        <div>
            <label className="block text-xs text-gray-400 mb-1">Transform Mode</label>
            <select
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                value={transformMode}
                onChange={e => setTransformMode(e.target.value as any)}
            >
                <option value="translate">Translate</option>
                <option value="rotate">Rotate</option>
                <option value="scale">Scale</option>
            </select>
        </div>

        {/* Components */}
        {node.components && Object.entries(node.components).map(([key, comp]: [string, any]) => {
            if (!comp) return null;
            return (
                <div key={key} className="border border-gray-600 rounded p-2 bg-gray-700/30">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-1">
                        <span className="font-bold capitalize text-sm">{key}</span>
                        <button
                            onClick={() => updateNode(n => {
                                const components = { ...n.components };
                                delete components[key as keyof typeof components];
                                return { ...n, components };
                            })}
                            className="text-xs"
                        >
                            ❌
                        </button>
                    </div>
                    <ComponentEditor component={comp} onChange={(newComp: any) => updateNode(n => ({
                        ...n,
                        components: { ...n.components, [key]: newComp }
                    }))} />
                </div>
            );
        })}

        {/* Add Component */}
        <div className="mt-2 pt-2 border-t border-gray-600">
            <label className="block text-xs text-gray-400 mb-1">Add Component</label>
            <div className="flex gap-2">
                <select
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 flex-1 text-sm"
                    value={addComponentType}
                    onChange={e => setAddComponentType(e.target.value)}
                >
                    {Object.keys(COMPONENT_DEFS).filter(k => !node.components?.[k]).map(k => (
                        <option key={k} value={k}>{k}</option>
                    ))}
                </select>
                <button
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                    onClick={() => {
                        const def = COMPONENT_DEFS[addComponentType];
                        if (def && !node.components?.[addComponentType]) {
                            updateNode(n => ({
                                ...n,
                                components: {
                                    ...n.components,
                                    [addComponentType]: { type: def.type, properties: def.defaultProps }
                                }
                            }));
                        }
                    }}
                >
                    Add
                </button>
            </div>
        </div>
    </div>
}

function ComponentEditor({ component, onChange }: { component: any, onChange: (c: any) => void }) {
    if (!component) return null;

    const updateComponent = (newProps: any) => {
        onChange({
            ...component,
            properties: { ...component.properties, ...newProps }
        });
    }

    const componentEditorMap = {
        'Transform': <ComponentEditors.TransformComponentEditor component={component} onUpdate={updateComponent} />,
        'Geometry': <ComponentEditors.GeometryComponentEditor component={component} onUpdate={updateComponent} />,
        'Material': <ComponentEditors.MaterialComponentEditor component={component} onUpdate={updateComponent} />,
        'Model': <ComponentEditors.ModelComponentEditor component={component} onUpdate={updateComponent} />,
        'Physics': <ComponentEditors.PhysicsComponentEditor component={component} onUpdate={updateComponent} />,
        'SpotLight': <ComponentEditors.SpotLightComponentEditor component={component} onUpdate={updateComponent} />,
    };

    return componentEditorMap[component.type as keyof typeof componentEditorMap] ?? <div className="text-xs text-gray-500">Unknown component type</div>;
}

export function Vector3Input({ label, value, onChange }: { label: string, value: [number, number, number], onChange: (v: [number, number, number]) => void }) {
    const handleChange = (index: number, val: string) => {
        const newValue = [...value] as [number, number, number];
        newValue[index] = parseFloat(val) || 0;
        onChange(newValue);
    };

    return <div>
        <label className="block text-xs text-gray-400 mb-1">{label}</label>
        <div className="flex gap-1">
            <div className="relative flex-1">
                <span className="absolute left-1 top-1 text-xs text-red-400 font-bold">X</span>
                <input className="w-full bg-gray-700 border border-gray-600 rounded pl-4 pr-1 py-1 text-xs" type="number" step="0.1" value={value[0]} onChange={e => handleChange(0, e.target.value)} />
            </div>
            <div className="relative flex-1">
                <span className="absolute left-1 top-1 text-xs text-green-400 font-bold">Y</span>
                <input className="w-full bg-gray-700 border border-gray-600 rounded pl-4 pr-1 py-1 text-xs" type="number" step="0.1" value={value[1]} onChange={e => handleChange(1, e.target.value)} />
            </div>
            <div className="relative flex-1">
                <span className="absolute left-1 top-1 text-xs text-blue-400 font-bold">Z</span>
                <input className="w-full bg-gray-700 border border-gray-600 rounded pl-4 pr-1 py-1 text-xs" type="number" step="0.1" value={value[2]} onChange={e => handleChange(2, e.target.value)} />
            </div>
        </div>
    </div>
}

function findNode(root: GameObjectType, id: string): GameObjectType | null {
    if (root.id === id) return root;
    if (root.children) {
        for (const child of root.children) {
            const found = findNode(child, id);
            if (found) return found;
        }
    }
    return null;
}

function updatePrefabNode(root: GameObjectType, id: string, update: (node: GameObjectType) => GameObjectType): GameObjectType {
    if (root.id === id) {
        return update(root);
    }
    if (root.children) {
        return {
            ...root,
            children: root.children.map(child => updatePrefabNode(child, id, update))
        };
    }
    return root;
}

function deletePrefabNode(root: GameObjectType, id: string): GameObjectType | null {
    if (root.id === id) return null;

    if (root.children) {
        return {
            ...root,
            children: root.children
                .map(child => deletePrefabNode(child, id))
                .filter((child): child is GameObjectType => child !== null)
        };
    }
    return root;
}

export default EditorUI;
