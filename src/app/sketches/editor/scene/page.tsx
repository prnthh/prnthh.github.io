"use client";

import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { ObjectTypes } from "./objectTypes";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentRow, RigidBodyComponentDefault, RigidBodyComponentData, withRigidBody } from "./components/RigidBodyComponent";
import type { Group, Object3DEventMap } from "three";
import type { RefObject } from "react";

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

function Object3DNode({ node, onSelect, selectedId, setTransformTarget }: { node: SceneGraphNode, onSelect: (node: SceneGraphNode) => void, selectedId?: string, setTransformTarget: (obj: Group<Object3DEventMap> | null) => void }) {
    // Use callback ref for selected node
    const groupRef = selectedId === node.id
        ? (instance: Group<Object3DEventMap> | null) => setTransformTarget(instance)
        : undefined;
    // Check for RigidBody component
    const rigidBodyComp = node.components?.find(c => c.type === "RigidBody");
    // Render different objects based on node type
    let children: React.ReactNode = null;
    if (node.type === "object") {
        const group = (
            <group ref={groupRef} name={node.name}>
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
                    <Object3DNode key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />
                ))}
            </group>
        );
        if (rigidBodyComp) {
            // Set transforms on RigidBody
            return (
                <RigidBody type={rigidBodyComp.data?.type || RigidBodyComponentDefault.type} position={node.props.position} rotation={node.props.rotation} scale={node.props.scale}>
                    {group}
                </RigidBody>
            );
        } else {
            // Set transforms on group
            return React.cloneElement(group, {
                position: node.props.position,
                rotation: node.props.rotation,
                scale: node.props.scale,
            });
        }
    } else if (node.type === "spotlight") {
        const group = (
            <group ref={groupRef} name={node.name}>
                <spotLight
                    color={node.props.color || "#ffffff"}
                    intensity={node.props.intensity || 1}
                    position={[0, 0, 0]}
                />
                <mesh onClick={e => { e.stopPropagation(); onSelect(node); }}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshBasicMaterial color={node.props.color || "#ffffff"} />
                </mesh>
                {node.children.map(child => (
                    <Object3DNode key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />
                ))}
            </group>
        );
        if (rigidBodyComp) {
            return (
                <RigidBody type={rigidBodyComp.data?.type || RigidBodyComponentDefault.type} position={node.props.position} rotation={node.props.rotation} scale={node.props.scale}>
                    {group}
                </RigidBody>
            );
        } else {
            return React.cloneElement(group, {
                position: node.props.position,
                rotation: node.props.rotation,
                scale: node.props.scale,
            });
        }
    } else if (node.type === "orthographicCamera") {
        const group = (
            <group ref={groupRef} name={node.name}>
                {node.children.map(child => (
                    <Object3DNode key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />
                ))}
            </group>
        );
        if (rigidBodyComp) {
            return (
                <RigidBody type={rigidBodyComp.data?.type || RigidBodyComponentDefault.type} position={node.props.position} rotation={node.props.rotation} scale={node.props.scale}>
                    {group}
                </RigidBody>
            );
        } else {
            return React.cloneElement(group, {
                position: node.props.position,
                rotation: node.props.rotation,
                scale: node.props.scale,
            });
        }
    }
    return null;
}

function EntityDetailsPanel({ node, onUpdate }: { node: SceneGraphNode; onUpdate: (updates: Partial<SceneGraphNode>) => void }) {
    const typeDef = ObjectTypes[node.type as keyof typeof ObjectTypes];
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

// --- Utility Functions ---
function findNodeById(node: SceneGraphNode, id: string): SceneGraphNode | null {
    if (node.id === id) return node;
    for (let c of node.children) {
        const found = findNodeById(c, id);
        if (found) return found;
    }
    return null;
}

function updateNodeById(node: SceneGraphNode, id: string, updates: Partial<SceneGraphNode>): SceneGraphNode {
    if (node.id === id) {
        if (updates.props) {
            return { ...node, props: { ...node.props, ...updates.props } };
        }
        return { ...node, ...updates };
    }
    return { ...node, children: node.children.map(child => updateNodeById(child, id, updates)) };
}

function removeNodeById(node: SceneGraphNode, id: string): SceneGraphNode {
    return {
        ...node,
        children: node.children
            .filter(c => c.id !== id)
            .map(c => removeNodeById(c, id)),
    };
}

function addNodeToParent(node: SceneGraphNode, parentId: string, newNode: SceneGraphNode): SceneGraphNode {
    if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode] };
    }
    return { ...node, children: node.children.map(child => addNodeToParent(child, parentId, newNode)) };
}

function stripDefaultsFromNode(node: SceneGraphNode): any {
    const typeDef = ObjectTypes[node.type as keyof typeof ObjectTypes];
    const result: any = {
        id: node.id,
        type: node.type,
        name: node.name,
        props: {},
        components: node.components && node.components.length > 0 ? node.components : undefined,
        children: node.children.map(stripDefaultsFromNode),
    };
    // Only include props that differ from defaults
    if (typeDef && typeDef.defaultProps) {
        for (const key in node.props) {
            if (
                JSON.stringify(node.props[key]) !==
                JSON.stringify((typeDef.defaultProps as Record<string, any>)[key])
            ) {
                result.props[key] = node.props[key];
            }
        }
    } else {
        result.props = { ...node.props };
    }
    // Remove empty props
    if (Object.keys(result.props).length === 0) delete result.props;
    // Remove undefined components
    if (!result.components) delete result.components;
    return result;
}

function applyDefaultsToNode(node: Omit<SceneGraphNode, "parent" | "children"> & { children: any[] }): SceneGraphNode {
    const typeDef = ObjectTypes[node.type as keyof typeof ObjectTypes];
    const props = typeDef && typeDef.defaultProps
        ? { ...typeDef.defaultProps, ...(node.props || {}) }
        : { ...(node.props || {}) };
    return {
        id: node.id,
        type: node.type,
        name: node.name,
        props,
        components: node.components || [],
        parent: null, // parent is always set at runtime
        children: (node.children || []).map(applyDefaultsToNode),
    };
}

// --- SceneGraphPanel ---
function SceneGraphPanel({ root, selectedId, onSelect, onAdd, onDragStart, onDrop }: {
    root: SceneGraphNode;
    selectedId: string | undefined;
    onSelect: (node: SceneGraphNode) => void;
    onAdd: (parent: SceneGraphNode, type?: "object" | "spotlight" | "orthographicCamera") => void;
    onDragStart: (node: SceneGraphNode) => void;
    onDrop: (targetNode: SceneGraphNode) => void;
}) {
    return (
        <div className="absolute top-32 left-2 width-[300px] bg-slate-800/20 rounded p-1">
            <h2>Scene Graph</h2>
            <SceneGraphTree
                node={root}
                selectedId={selectedId}
                onSelect={onSelect}
                onAdd={onAdd}
                onDragStart={onDragStart}
                onDrop={onDrop}
            />
        </div>
    );
}

// --- EditorCanvas ---
function EditorCanvas({
    root,
    selected,
    setSelected,
    setRoot,
    transformTarget,
    setTransformTarget,
    sceneSettings,
}: {
    root: SceneGraphNode;
    selected: SceneGraphNode | null;
    setSelected: (node: SceneGraphNode) => void;
    setRoot: React.Dispatch<React.SetStateAction<SceneGraphNode>>;
    transformTarget: Group<Object3DEventMap> | null;
    setTransformTarget: (obj: Group<Object3DEventMap> | null) => void;
    sceneSettings: { physics: boolean };
}) {
    return (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
            <Canvas>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                {sceneSettings.physics ? (
                    <Physics>
                        <group>
                            {selected && transformTarget && (
                                <TransformControls
                                    object={transformTarget}
                                    mode="translate"
                                    onObjectChange={() => {
                                        if (selected && transformTarget) {
                                            const parent = transformTarget.parent;
                                            const worldPos = transformTarget.getWorldPosition(new THREE.Vector3());
                                            const worldQuat = transformTarget.getWorldQuaternion(new THREE.Quaternion());
                                            const worldScale = transformTarget.getWorldScale(new THREE.Vector3());
                                            let localPos = worldPos.clone();
                                            let localQuat = worldQuat.clone();
                                            let localScale = worldScale.clone();
                                            if (parent) {
                                                parent.worldToLocal(localPos);
                                                const parentWorldQuat = parent.getWorldQuaternion(new THREE.Quaternion());
                                                localQuat.premultiply(parentWorldQuat.invert());
                                                const parentWorldScale = parent.getWorldScale(new THREE.Vector3());
                                                localScale.divide(parentWorldScale);
                                            }
                                            const localEuler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');
                                            // Update both selected and root
                                            setSelected(prev => prev ? {
                                                ...prev,
                                                props: {
                                                    ...prev.props,
                                                    position: [localPos.x, localPos.y, localPos.z],
                                                    rotation: [localEuler.x, localEuler.y, localEuler.z],
                                                    scale: [localScale.x, localScale.y, localScale.z],
                                                }
                                            } : null);
                                            setRoot(prev => updateNodeById(prev, selected.id, {
                                                props: {
                                                    position: [localPos.x, localPos.y, localPos.z],
                                                    rotation: [localEuler.x, localEuler.y, localEuler.z],
                                                    scale: [localScale.x, localScale.y, localScale.z],
                                                }
                                            }));
                                        }
                                    }}
                                />
                            )}
                            <Object3DNode node={root} onSelect={setSelected} selectedId={selected?.id} setTransformTarget={setTransformTarget} />
                        </group>
                        <gridHelper args={[10, 10, "#888", "#444"]} />
                    </Physics>
                ) : (
                    <>
                        <group>
                            {selected && transformTarget && (
                                <TransformControls
                                    object={transformTarget}
                                    mode="translate"
                                    onObjectChange={() => {
                                        if (selected && transformTarget) {
                                            const parent = transformTarget.parent;
                                            const worldPos = transformTarget.getWorldPosition(new THREE.Vector3());
                                            const worldQuat = transformTarget.getWorldQuaternion(new THREE.Quaternion());
                                            const worldScale = transformTarget.getWorldScale(new THREE.Vector3());
                                            let localPos = worldPos.clone();
                                            let localQuat = worldQuat.clone();
                                            let localScale = worldScale.clone();
                                            if (parent) {
                                                parent.worldToLocal(localPos);
                                                const parentWorldQuat = parent.getWorldQuaternion(new THREE.Quaternion());
                                                localQuat.premultiply(parentWorldQuat.invert());
                                                const parentWorldScale = parent.getWorldScale(new THREE.Vector3());
                                                localScale.divide(parentWorldScale);
                                            }
                                            const localEuler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');
                                            // Update both selected and root
                                            setSelected(prev => prev ? {
                                                ...prev,
                                                props: {
                                                    ...prev.props,
                                                    position: [localPos.x, localPos.y, localPos.z],
                                                    rotation: [localEuler.x, localEuler.y, localEuler.z],
                                                    scale: [localScale.x, localScale.y, localScale.z],
                                                }
                                            } : null);
                                            setRoot(prev => updateNodeById(prev, selected.id, {
                                                props: {
                                                    position: [localPos.x, localPos.y, localPos.z],
                                                    rotation: [localEuler.x, localEuler.y, localEuler.z],
                                                    scale: [localScale.x, localScale.y, localScale.z],
                                                }
                                            }));
                                        }
                                    }}
                                />
                            )}
                            <Object3DNode node={root} onSelect={setSelected} selectedId={selected?.id} setTransformTarget={setTransformTarget} />
                        </group>
                        <gridHelper args={[10, 10, "#888", "#444"]} />
                    </>
                )}
                <OrbitControls makeDefault />
            </Canvas>
        </div>
    );
}

// --- Main Editor Page ---
export default function Home() {
    // Scene settings state
    const [sceneSettings, setSceneSettings] = useState<{ physics: boolean }>({ physics: true });
    // Root node state
    const [root, setRoot] = useState<SceneGraphNode>(() => createNode("object", "Root"));
    const [selected, setSelected] = useState<SceneGraphNode | null>(null);
    const [showSceneDetails, setShowSceneDetails] = useState(false);
    const [sceneText, setSceneText] = useState<string>("");
    const dragNode = useRef<SceneGraphNode | null>(null);
    const [transformTarget, setTransformTarget] = useState<Group<Object3DEventMap> | null>(null);

    // Add a new node as a child
    const handleAdd = (parent: SceneGraphNode, type: "object" | "spotlight" | "orthographicCamera" = "object") => {
        setRoot(prev => addNodeToParent(prev, parent.id, createNode(type)));
    };

    // Drag-and-drop reparenting
    const handleDragStart = (node: SceneGraphNode) => {
        dragNode.current = node;
    };
    const handleDrop = (targetNode: SceneGraphNode) => {
        if (!dragNode.current || dragNode.current.id === targetNode.id) return;
        setRoot(prev => {
            const dragged = findNodeById(prev, dragNode.current!.id);
            if (!dragged) return prev;
            const withoutDragged = removeNodeById(prev, dragNode.current!.id);
            return addNodeToParent(withoutDragged, targetNode.id, dragged);
        });
        dragNode.current = null;
    };

    // Update a node in the tree and selected
    const handleUpdateSelected = (updates: Partial<SceneGraphNode>) => {
        if (!selected) return;
        setRoot(prev => updateNodeById(prev, selected.id, updates));
        setSelected(prev => prev ? { ...prev, ...updates, props: { ...prev.props, ...updates.props } } : null);
    };

    // Keep sceneText in sync with root and settings
    useEffect(() => {
        if (!showSceneDetails) return;
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

    useEffect(() => {
        setTransformTarget(null);
    }, [selected?.id]);

    return (
        <>
            <EditorCanvas
                root={root}
                selected={selected}
                setSelected={setSelected}
                setRoot={setRoot}
                transformTarget={transformTarget}
                setTransformTarget={setTransformTarget}
                sceneSettings={sceneSettings}
            />
            <SceneGraphPanel
                root={root}
                selectedId={selected?.id}
                onSelect={setSelected}
                onAdd={handleAdd}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
            />
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
