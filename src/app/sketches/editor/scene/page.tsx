"use client";

import React, { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ObjectTypes } from "./objectTypes";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentRow, RigidBodyComponentDefault, RigidBodyComponentData, withRigidBody } from "./components/RigidBodyComponent";

// Types for scene graph
export type SceneGraphNode = {
    id: string;
    name: string;
    type: "object" | "spotlight" | "orthographicCamera";
    children: SceneGraphNode[];
    parent: SceneGraphNode | null;
    props: Record<string, any>;
    components?: Array<{
        type: string;
        data?: any;
    }>;
};

function createNode(type: "object" | "spotlight" | "orthographicCamera" = "object", name?: string): SceneGraphNode {
    const typeDef = ObjectTypes[type];
    return {
        id: Math.random().toString(36).substr(2, 9),
        name: name || typeDef.defaultProps.name,
        type,
        children: [],
        parent: null,
        props: { ...typeDef.defaultProps },
        components: [],
    };
}

// AddMenu component for add button and menu
function AddMenu({ onAdd }: { onAdd: (type: "object" | "spotlight" | "orthographicCamera") => void }) {
    const [open, setOpen] = useState(false);
    return (
        <span style={{ display: 'inline-block', position: 'relative' }}>
            <button style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); setOpen(true); }}>+</button>
            {open && (
                <div style={{ display: 'inline-block', marginLeft: 4, background: '#f8f8f8', border: '1px solid #ccc', borderRadius: 4, padding: 4, zIndex: 10, position: 'absolute', left: 0 }}>
                    <button style={{ display: 'block', width: '100%' }} onClick={e => { e.stopPropagation(); onAdd("object"); setOpen(false); }}>Object</button>
                    <button style={{ display: 'block', width: '100%' }} onClick={e => { e.stopPropagation(); onAdd("spotlight"); setOpen(false); }}>Spotlight</button>
                    <button style={{ display: 'block', width: '100%' }} onClick={e => { e.stopPropagation(); onAdd("orthographicCamera"); setOpen(false); }}>OrthoCam</button>
                    <button style={{ display: 'block', width: '100%', color: '#888' }} onClick={e => { e.stopPropagation(); setOpen(false); }}>Cancel</button>
                </div>
            )}
        </span>
    );
}

function SceneGraphTree({
    node,
    selectedId,
    onSelect,
    onAdd,
    onDragStart,
    onDrop,
}: {
    node: SceneGraphNode;
    selectedId: string | undefined;
    onSelect: (node: SceneGraphNode) => void;
    onAdd: (parent: SceneGraphNode, type?: "object" | "spotlight" | "orthographicCamera") => void;
    onDragStart: (node: SceneGraphNode) => void;
    onDrop: (targetNode: SceneGraphNode) => void;
}) {
    return (
        <div
            style={{
                marginLeft: 16,
                border: selectedId === node.id ? "1px solid #4f8cff" : undefined,
                background: selectedId === node.id ? "#e6f0ff" : undefined,
                padding: 2,
                cursor: "pointer",
            }}
            draggable
            onDragStart={e => {
                e.stopPropagation();
                onDragStart(node);
            }}
            onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                onDrop(node);
            }}
            onDragOver={e => e.preventDefault()}
            onClick={e => {
                e.stopPropagation();
                onSelect(node);
            }}
        >
            {node.name} <span style={{ fontSize: 10, color: '#888' }}>({node.type})</span>
            <AddMenu onAdd={type => onAdd(node, type)} />
            {node.children.map(child => (
                <SceneGraphTree
                    key={child.id}
                    node={child}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onAdd={onAdd}
                    onDragStart={onDragStart}
                    onDrop={onDrop}
                />
            ))}
        </div>
    );
}

function Object3DNode({ node, onSelect }: { node: SceneGraphNode, onSelect: (node: SceneGraphNode) => void }) {
    const ref = useRef<THREE.Group>(null);
    let children = (
        <group ref={ref} name={node.name} position={node.props.position} rotation={node.props.rotation} scale={node.props.scale}>
            <mesh
                onClick={e => {
                    e.stopPropagation();
                    onSelect(node);
                }}
            >
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color={node.props.material || "#4f8cff"} />
            </mesh>
            {node.children.map(child => (
                <Object3DNode key={child.id} node={child} onSelect={onSelect} />
            ))}
        </group>
    );
    // Wrap with components
    if (node.components) {
        for (const comp of node.components) {
            if (comp.type === "RigidBody") {
                children = withRigidBody(children, comp.data || RigidBodyComponentDefault);
            }
        }
    }
    return children;
}

function EntityDetailsPanel({ node, onUpdate }: { node: SceneGraphNode; onUpdate: (updates: Partial<SceneGraphNode>) => void }) {
    const typeDef = ObjectTypes[node.type];
    const [addMenuOpen, setAddMenuOpen] = React.useState(false);
    const hasRigidBody = node.components?.some(c => c.type === "RigidBody");
    // --- COMPONENTS UI ---
    const handleComponentChange = (idx: number, data: any) => {
        const newComponents = (node.components || []).map((c, i) => i === idx ? { ...c, data } : c);
        onUpdate({ components: newComponents });
    };
    const handleComponentDelete = (idx: number) => {
        const newComponents = (node.components || []).filter((_, i) => i !== idx);
        onUpdate({ components: newComponents });
    };
    const handleAddComponent = (type: string) => {
        if (type === "RigidBody" && !(node.components || []).some(c => c.type === "RigidBody")) {
            onUpdate({ components: [...(node.components || []), { type: "RigidBody", data: { ...RigidBodyComponentDefault } }] });
        }
        setAddMenuOpen(false);
    };
    if (typeDef && typeDef.DetailsView) {
        const DetailsView = typeDef.DetailsView;
        return (
            <>
                <DetailsView node={node} onUpdate={onUpdate} />
                <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                        {(node.components || []).map((comp, idx) => {
                            if (comp.type === "RigidBody") {
                                return (
                                    <RigidBodyComponentRow
                                        key={"rb"}
                                        data={comp.data || RigidBodyComponentDefault}
                                        onChange={data => handleComponentChange(idx, data)}
                                        onDelete={() => handleComponentDelete(idx)}
                                    />
                                );
                            }
                            return null;
                        })}
                    </div>
                    <button onClick={() => setAddMenuOpen(v => !v)} style={{ width: '100%' }}>Add Component</button>
                    {addMenuOpen && (
                        <div style={{ background: '#222', color: '#fff', borderRadius: 4, marginTop: 4, zIndex: 10, position: 'relative' }}>
                            <button style={{ display: 'block', width: '100%' }} disabled={hasRigidBody} onClick={() => handleAddComponent("RigidBody")}>RigidBody</button>
                            <button style={{ display: 'block', width: '100%', color: '#888' }} onClick={() => setAddMenuOpen(false)}>Cancel</button>
                        </div>
                    )}
                </div>
            </>
        );
    }
    // fallback generic editor
    return (
        <div>
            <div>
                Name: <input value={node.name} onChange={e => onUpdate({ name: e.target.value })} style={{ fontFamily: 'monospace', width: 100 }} />
            </div>
            <div>
                Type: <span style={{ fontFamily: 'monospace' }}>{node.type}</span>
            </div>
            <div>
                ID: <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{node.id}</span>
            </div>
            <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8 }}>
                    {(node.components || []).map((comp, idx) => {
                        if (comp.type === "RigidBody") {
                            return (
                                <RigidBodyComponentRow
                                    key={"rb"}
                                    data={comp.data || RigidBodyComponentDefault}
                                    onChange={data => handleComponentChange(idx, data)}
                                    onDelete={() => handleComponentDelete(idx)}
                                />
                            );
                        }
                        return null;
                    })}
                </div>
                <button onClick={() => setAddMenuOpen(v => !v)} style={{ width: '100%' }}>Add Component</button>
                {addMenuOpen && (
                    <div style={{ background: '#222', color: '#fff', borderRadius: 4, marginTop: 4, zIndex: 10, position: 'relative' }}>
                        <button style={{ display: 'block', width: '100%' }} disabled={(node.components || []).some(c => c.type === "RigidBody")} onClick={() => handleAddComponent("RigidBody")}>RigidBody</button>
                        <button style={{ display: 'block', width: '100%', color: '#888' }} onClick={() => setAddMenuOpen(false)}>Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function SceneDetailsPanel({ sceneSettings, setSceneSettings, sceneText, setSceneText, onSceneTextBlur }: {
    sceneSettings: { physics: boolean };
    setSceneSettings: React.Dispatch<React.SetStateAction<{ physics: boolean }>>;
    sceneText: string;
    setSceneText: React.Dispatch<React.SetStateAction<string>>;
    onSceneTextBlur: () => void;
}) {
    return (
        <>
            <h2>Scene</h2>
            <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                        type="checkbox"
                        checked={sceneSettings.physics}
                        onChange={e => setSceneSettings(s => ({ ...s, physics: e.target.checked }))}
                    />
                    Enable Physics
                </label>
            </div>
            <textarea
                style={{ width: '100%', minHeight: 200, fontFamily: 'monospace', fontSize: 12 }}
                value={sceneText}
                onChange={e => setSceneText(e.target.value)}
                onBlur={onSceneTextBlur}
            />
        </>
    );
}

// Utility: Remove default values from node for saving
function stripDefaultsFromNode(node: SceneGraphNode): any {
    const typeDef = ObjectTypes[node.type];
    const defaults = typeDef.defaultProps;
    // Only include props that differ from defaults
    const props: Record<string, any> = {};
    for (const key in node.props) {
        if (
            Array.isArray(node.props[key]) &&
            Array.isArray((defaults as any)[key])
        ) {
            if (JSON.stringify(node.props[key]) !== JSON.stringify((defaults as any)[key])) {
                props[key] = node.props[key];
            }
        } else if (node.props[key] !== (defaults as any)[key]) {
            props[key] = node.props[key];
        }
    }
    // Only include name if different from default
    const result: any = {
        id: node.id,
        type: node.type,
        ...(node.name !== defaults.name ? { name: node.name } : {}),
        ...(Object.keys(props).length > 0 ? { props } : {}),
        ...(node.components && node.components.length > 0 ? { components: node.components } : {}),
        children: node.children.map(stripDefaultsFromNode),
    };
    return result;
}

// Utility: Apply defaults to node for loading
function applyDefaultsToNode(
    node: { id: string; name?: string; type: keyof typeof ObjectTypes; props?: Record<string, any>; children?: any[]; components?: any[] }
): SceneGraphNode {
    const typeDef = ObjectTypes[node.type];
    const defaults = typeDef.defaultProps;
    const props = { ...defaults, ...(node.props || {}) };
    const name = node.name !== undefined ? node.name : defaults.name;
    return {
        id: node.id,
        name,
        type: node.type,
        parent: null,
        props,
        children: (node.children || []).map(applyDefaultsToNode),
        components: Array.isArray(node.components)
            ? node.components.map(comp =>
                typeof comp === "string"
                    ? { type: comp }
                    : comp
            )
            : [],
    };
}

export default function Home() {
    // Scene settings state
    const [sceneSettings, setSceneSettings] = useState<{ physics: boolean }>({ physics: true });
    // Root node state
    const [root, setRoot] = useState<SceneGraphNode>(() => createNode("object", "Root"));
    const [selected, setSelected] = useState<SceneGraphNode | null>(null);
    const [showSceneDetails, setShowSceneDetails] = useState(false);
    const [sceneText, setSceneText] = useState<string>("");
    const dragNode = useRef<SceneGraphNode | null>(null);

    // Add a new node as a child
    const handleAdd = (parent: SceneGraphNode, type: "object" | "spotlight" | "orthographicCamera" = "object") => {
        setRoot(prev => {
            const newNode = createNode(type);
            function addChild(node: SceneGraphNode): SceneGraphNode {
                if (node.id === parent.id) {
                    return { ...node, children: [...node.children, newNode] };
                }
                return { ...node, children: node.children.map(addChild) };
            }
            return addChild(prev);
        });
    };

    // Drag-and-drop reparenting
    const handleDragStart = (node: SceneGraphNode) => {
        dragNode.current = node;
    };
    const handleDrop = (targetNode: SceneGraphNode) => {
        if (!dragNode.current || dragNode.current.id === targetNode.id) return;
        setRoot(prev => {
            function removeNode(node: SceneGraphNode, id: string): SceneGraphNode {
                return {
                    ...node,
                    children: node.children
                        .filter(c => c.id !== id)
                        .map(c => removeNode(c, id)),
                };
            }
            function findNode(node: SceneGraphNode, id: string): SceneGraphNode | null {
                if (node.id === id) return node;
                for (let c of node.children) {
                    const found = findNode(c, id);
                    if (found) return found;
                }
                return null;
            }
            if (!dragNode.current) return prev; // Extra safety check
            const dragged = findNode(prev, dragNode.current.id);
            if (!dragged) return prev;
            function addToTarget(node: SceneGraphNode): SceneGraphNode {
                if (node.id === targetNode.id && dragged) {
                    return {
                        ...node,
                        children: [
                            ...node.children,
                            {
                                id: dragged.id,
                                name: dragged.name,
                                type: dragged.type,
                                children: dragged.children,
                                parent: node,
                                props: { ...dragged.props },
                            }
                        ]
                    };
                }
                return { ...node, children: node.children.map(addToTarget) };
            }
            const withoutDragged = removeNode(prev, dragNode.current!.id);
            return addToTarget(withoutDragged);
        });
        dragNode.current = null;
    };

    // Update a node in the tree and selected
    const handleUpdateSelected = (updates: Partial<SceneGraphNode>) => {
        if (!selected) return;
        function updateNode(node: SceneGraphNode): SceneGraphNode {
            if (selected && node.id === selected.id) {
                // If props is being updated, merge props
                if (updates.props) {
                    return { ...node, props: { ...node.props, ...updates.props } };
                }
                return { ...node, ...updates };
            }
            return { ...node, children: node.children.map(updateNode) };
        }
        const newRoot = updateNode(root);
        setRoot(newRoot);
        // Find the updated node reference
        function findNode(node: SceneGraphNode, id: string): SceneGraphNode | null {
            if (node.id === id) return node;
            for (let c of node.children) {
                const found = findNode(c, id);
                if (found) return found;
            }
            return null;
        }
        const updatedNode = findNode(newRoot, selected.id);
        setSelected(updatedNode);
    };

    // Keep sceneText in sync with root and settings
    React.useEffect(() => {
        if (!showSceneDetails) return;
        // Only save changed values
        setSceneText(
            JSON.stringify(
                { settings: sceneSettings, graph: stripDefaultsFromNode(root) },
                null,
                2
            )
        );
    }, [root, sceneSettings, showSceneDetails]);

    // Handle textarea blur (load scene if valid JSON)
    const handleSceneTextBlur = () => {
        try {
            const parsed = JSON.parse(sceneText);
            // Must have settings and graph
            if (
                parsed && typeof parsed === 'object' &&
                parsed.settings && typeof parsed.settings === 'object' &&
                parsed.graph && typeof parsed.graph === 'object' &&
                parsed.graph.id && parsed.graph.type && Array.isArray(parsed.graph.children)
            ) {
                setSceneSettings(parsed.settings);
                setRoot(applyDefaultsToNode(parsed.graph));
                setSelected(null);
            }
        } catch (e) {
            // ignore parse errors
        }
    };

    return (
        <>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                <Canvas>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    {sceneSettings.physics ? (
                        <Physics>
                            <group>
                                <Object3DNode node={root} onSelect={node => setSelected(node)} />
                            </group>
                            <gridHelper args={[10, 10, "#888", "#444"]} />
                        </Physics>
                    ) : (
                        <>
                            <group>
                                <Object3DNode node={root} onSelect={node => setSelected(node)} />
                            </group>
                            <gridHelper args={[10, 10, "#888", "#444"]} />
                        </>
                    )}
                    <OrbitControls />
                </Canvas>
            </div>
            <div className="absolute top-32 left-2 width-[300px] bg-slate-800/20 rounded p-1">
                <h2>Scene Graph</h2>
                <SceneGraphTree
                    node={root}
                    selectedId={selected?.id}
                    onSelect={setSelected}
                    onAdd={handleAdd}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                />
            </div>
            <div className="absolute top-4 right-2 width-[300px] bg-slate-800/20 rounded p-1">
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button
                        style={{ fontWeight: !showSceneDetails ? 'bold' : undefined }}
                        onClick={() => setShowSceneDetails(false)}
                    >
                        Entity Details
                    </button>
                    <button
                        style={{ fontWeight: showSceneDetails ? 'bold' : undefined }}
                        onClick={() => setShowSceneDetails(true)}
                    >
                        Scene Details
                    </button>
                </div>
                {!showSceneDetails && selected && (
                    <>
                        <h2>Entity Details</h2>
                        <EntityDetailsPanel node={selected} onUpdate={handleUpdateSelected} />
                    </>
                )}
                {showSceneDetails && (
                    <SceneDetailsPanel
                        sceneSettings={sceneSettings}
                        setSceneSettings={setSceneSettings}
                        sceneText={sceneText}
                        setSceneText={setSceneText}
                        onSceneTextBlur={handleSceneTextBlur}
                    />
                )}
            </div>
        </>
    );
}
