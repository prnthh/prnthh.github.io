import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import { Prefab, GameObject as GameObjectType, COMPONENT_DEFS } from "./types";
import ComponentEditors from './components';
import EditorTree from './EditorTree';
import { getAllComponents } from './components/ComponentRegistry';


function EditorUI({ prefabData, setPrefabData, selectedId, setSelectedId, transformMode, setTransformMode }: {
    prefabData?: Prefab;
    setPrefabData?: Dispatch<SetStateAction<Prefab>>;
    selectedId: string | null;
    setSelectedId: Dispatch<SetStateAction<string | null>>;
    transformMode: "translate" | "rotate" | "scale";
    setTransformMode: (m: "translate" | "rotate" | "scale") => void;
}) {
    const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);

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
    return <>
        <div className='absolute top-2 right-2 z-20 bg-black/70 backdrop-blur-sm text-white border border-cyan-500/30 ' >
            <div
                className="px-1.5 py-1 font-mono text-[10px] bg-cyan-500/10 border-b border-cyan-500/30 sticky top-0 uppercase tracking-wider text-cyan-400/80 cursor-pointer hover:bg-cyan-500/20 flex items-center justify-between"
                onClick={() => setIsInspectorCollapsed(!isInspectorCollapsed)}
            >
                <span>Inspector</span>
                <span className="text-[8px]">{isInspectorCollapsed ? '◀' : '▶'}</span>
            </div>
            {!isInspectorCollapsed && (
                <NodeInspector
                    node={selectedNode}
                    updateNode={updateNode}
                    deleteNode={deleteNode}
                    transformMode={transformMode}
                    setTransformMode={setTransformMode}
                />
            )}
        </div>
        <div className='absolute top-12 left-2 z-20'>
            <EditorTree
                prefabData={prefabData}
                setPrefabData={setPrefabData}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
            />
        </div>
    </>;
}

function NodeInspector({ node, updateNode, deleteNode, transformMode, setTransformMode }: {
    node: GameObjectType;
    updateNode: (updater: (n: GameObjectType) => GameObjectType) => void;
    deleteNode: () => void;
    transformMode: "translate" | "rotate" | "scale";
    setTransformMode: (m: "translate" | "rotate" | "scale") => void;
}) {
    const [addComponentType, setAddComponentType] = useState(Object.keys(COMPONENT_DEFS)[0]);
    const ALL_COMPONENTS = getAllComponents();

    const componentKeys = Object.keys(node.components || {}).join(',');
    useEffect(() => {
        const available = Object.keys(COMPONENT_DEFS).filter(k => !node.components?.[k]);
        if (!available.includes(addComponentType)) {
            setAddComponentType(available[0] || "");
        }
    }, [componentKeys, addComponentType, node.components]);

    return <div className="flex flex-col gap-1 text-[11px] max-w-[250px] max-h-[80vh] overflow-y-auto">
        <div className="border-b border-cyan-500/20 pb-1 px-1.5 pt-1">
            <input
                className="w-full bg-black/40 border border-cyan-500/30 px-1 py-0.5 text-[11px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50"
                value={node.id}
                onChange={e => updateNode(n => ({ ...n, id: e.target.value }))}
            />
        </div>

        <div className="flex justify-between items-center px-1.5 py-0.5 border-b border-cyan-500/20">
            <label className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider">Components</label>
            <button onClick={deleteNode} className="text-[10px] text-red-400/80 hover:text-red-400">✕</button>
        </div>

        <div className="px-1.5 py-1 border-b border-cyan-500/20">
            <label className="block text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">Mode</label>
            <div className="flex gap-0.5">
                {["translate", "rotate", "scale"].map(mode => (
                    <button
                        key={mode}
                        onClick={() => setTransformMode(mode as any)}
                        className={`flex-1 px-1 py-0.5 text-[10px] font-mono border ${transformMode === mode ? 'bg-cyan-500/30 border-cyan-400/50 text-cyan-200' : 'bg-black/30 border-cyan-500/20 text-cyan-400/60 hover:border-cyan-400/30'}`}
                    >
                        {mode[0].toUpperCase()}
                    </button>
                ))}
            </div>
        </div>

        {/* Components */}
        {node.components && Object.entries(node.components).map(([key, comp]: [string, any]) => {
            if (!comp) return null;
            return (
                <div key={key} className="border border-cyan-500/20 mx-1 my-0.5 bg-black/20">
                    <div className="flex justify-between items-center px-1 py-0.5 border-b border-cyan-500/20 bg-cyan-500/5">
                        <span className="font-mono text-[10px] text-cyan-300 uppercase">{key}</span>
                        <button
                            onClick={() => updateNode(n => {
                                const components = { ...n.components };
                                delete components[key as keyof typeof components];
                                return { ...n, components };
                            })}
                            className="text-[9px] text-red-400/60 hover:text-red-400"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="px-1 py-0.5">
                        <ComponentEditor component={comp} onChange={(newComp: any) => updateNode(n => ({
                            ...n,
                            components: { ...n.components, [key]: newComp }
                        }))} />
                    </div>
                </div>
            );
        })}

        {/* Add Component */}
        <div className="px-1.5 py-1 border-t border-cyan-500/20">
            <label className="block text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">Add Component</label>
            <div className="flex gap-0.5">
                <select
                    className="bg-black/40 border border-cyan-500/30 px-1 py-0.5 flex-1 text-[10px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50"
                    value={addComponentType}
                    onChange={e => setAddComponentType(e.target.value)}
                >
                    {Object.keys(COMPONENT_DEFS).filter(k => !node.components?.[k]).map(k => (
                        <option key={k} value={k}>{k}</option>
                    ))}
                </select>
                <button
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 px-2 py-0.5 text-[10px] text-cyan-300 font-mono disabled:opacity-30"
                    disabled={!addComponentType}
                    onClick={() => {
                        if (!addComponentType) return;
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
                    +
                </button>
            </div>
        </div>


        {node.components && Object.entries(node.components).map(([key, comp]: [string, any]) => {
            if (!comp) return null;
            const componentDef = ALL_COMPONENTS[comp.type];
            if (!componentDef) return null;
            const EditorComp = componentDef.Editor;
            return (
                <div key={key} className='px-1'>
                    <div className="flex justify-between items-center py-0.5 border-b border-cyan-500/20 bg-cyan-500/5">
                        <span className="font-mono text-[10px] text-cyan-300 uppercase">{key}</span>
                        <button
                            onClick={() => updateNode(n => {
                                const components = { ...n.components };
                                delete components[key as keyof typeof components];
                                return { ...n, components };
                            })}
                            className="text-[9px] text-red-400/60 hover:text-red-400"
                        >
                            ✕
                        </button>
                    </div>
                    {EditorComp ? (
                        <EditorComp
                            component={comp}
                            onUpdate={(newProps: any) => updateNode(n => ({
                                ...n,
                                components: {
                                    ...n.components,
                                    [key]: {
                                        ...comp,
                                        properties: { ...comp.properties, ...newProps }
                                    }
                                }
                            }))}
                        />
                    ) : null}
                </div>
            );
        })}

        {JSON.stringify(ALL_COMPONENTS)}

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

    return <div className="mb-1">
        <label className="block text-[9px] text-cyan-400/60 uppercase tracking-wider mb-0.5">{label}</label>
        <div className="flex gap-0.5">
            <div className="relative flex-1">
                <span className="absolute left-0.5 top-0 text-[8px] text-red-400/80 font-mono">X</span>
                <input className="w-full bg-black/40 border border-cyan-500/30 pl-3 pr-0.5 py-0.5 text-[10px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50" type="number" step="0.1" value={value[0]} onChange={e => handleChange(0, e.target.value)} />
            </div>
            <div className="relative flex-1">
                <span className="absolute left-0.5 top-0 text-[8px] text-green-400/80 font-mono">Y</span>
                <input className="w-full bg-black/40 border border-cyan-500/30 pl-3 pr-0.5 py-0.5 text-[10px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50" type="number" step="0.1" value={value[1]} onChange={e => handleChange(1, e.target.value)} />
            </div>
            <div className="relative flex-1">
                <span className="absolute left-0.5 top-0 text-[8px] text-blue-400/80 font-mono">Z</span>
                <input className="w-full bg-black/40 border border-cyan-500/30 pl-3 pr-0.5 py-0.5 text-[10px] text-cyan-300 font-mono focus:outline-none focus:border-cyan-400/50" type="number" step="0.1" value={value[2]} onChange={e => handleChange(2, e.target.value)} />
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
