"use client";

import React, { useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { ObjectTypes } from "./objectTypes";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentRow, RigidBodyComponentDefault } from "./components/RigidBodyComponent";
import type { Group, Object3DEventMap } from "three";
import { EditorProvider, useEditorContext } from "./EditorContext";
import {
    updateNodeById,
} from "./sceneGraphUtils";
import { ObjectNode } from "./objectTypes/Object3D";
import { SpotlightNode } from "./objectTypes/SpotLight";
import { OrthographicCameraNode } from "./objectTypes/OrthoCamera";

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

// --- SceneGraphPanel ---
function SceneGraphPanel({
    root,
    selectedId,
    onSelect,
    onAdd,
    onDragStart,
    onDrop,
}: {
    root: any;
    selectedId: string | undefined;
    onSelect: (node: any) => void;
    onAdd: (parent: any, type?: "object" | "spotlight" | "orthographicCamera") => void;
    onDragStart: (node: any) => void;
    onDrop: (targetNode: any) => void;
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

// --- PlaybackController ---
function PlaybackController() {
    const { isPlaying, isPaused } = useEditorContext();
    useFrame(() => {
        if (isPlaying && !isPaused) {
            // TODO: Insert simulation step logic here
            // For now, just log for demonstration
            // console.log('Sim step');
        }
    });
    return null;
}

// --- PlaybackControls ---
function PlaybackControls({ isPlaying, onPlay, onPause, onStop }: {
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
}) {
    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 gap-2 flex">
            {!isPlaying && (
                <button onClick={onPlay}>▶️</button>
            )}
            {isPlaying && (
                <>
                    <button onClick={onPause}>⏸️</button>
                    <button onClick={onStop}>⏹️</button>
                </>
            )}
        </div>
    );
}

// --- EditorCanvas ---
function EditorCanvas({
    sceneSettings,
}: {
    sceneSettings: { physics: boolean };
}) {
    const { root, selected, setSelected, setRoot, transformTarget, setTransformTarget, isPlaying } = useEditorContext();

    return (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
            <Canvas>
                <PlaybackController />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                {sceneSettings.physics ? (
                    <Physics paused={!isPlaying}>
                        <group>
                            {selected && transformTarget && transformTarget.parent && (
                                <TransformControls
                                    object={transformTarget}
                                    mode="translate"
                                    onObjectChange={() => {
                                        if (selected && transformTarget) {
                                            const parent = transformTarget.parent;
                                            const worldPos = transformTarget.getWorldPosition(new THREE.Vector3());
                                            const worldQuat = transformTarget.getWorldQuaternion(new THREE.Quaternion());
                                            const worldScale = transformTarget.getWorldScale(new THREE.Vector3());
                                            const localPos = worldPos.clone();
                                            const localQuat = worldQuat.clone();
                                            const localScale = worldScale.clone();
                                            if (parent) {
                                                parent.worldToLocal(localPos);
                                                const parentWorldQuat = parent.getWorldQuaternion(new THREE.Quaternion());
                                                localQuat.premultiply(parentWorldQuat.invert());
                                                const parentWorldScale = parent.getWorldScale(new THREE.Vector3());
                                                localScale.divide(parentWorldScale);
                                            }
                                            const localEuler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');
                                            // Update both selected and root
                                            if (selected) {
                                                setSelected(selected ? {
                                                    ...selected,
                                                    props: {
                                                        ...selected.props,
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
                                        }
                                    }}
                                />
                            )}
                            <ObjectNode node={root} onSelect={setSelected} selectedId={selected?.id} setTransformTarget={setTransformTarget} />
                        </group>
                        <gridHelper args={[10, 10, "#888", "#444"]} />
                    </Physics>
                ) : (
                    <>
                        <group>
                            {selected && transformTarget && transformTarget.parent && (
                                <TransformControls
                                    object={transformTarget}
                                    mode="translate"
                                    onObjectChange={() => {
                                        if (selected && transformTarget) {
                                            const parent = transformTarget.parent;
                                            const worldPos = transformTarget.getWorldPosition(new THREE.Vector3());
                                            const worldQuat = transformTarget.getWorldQuaternion(new THREE.Quaternion());
                                            const worldScale = transformTarget.getWorldScale(new THREE.Vector3());
                                            const localPos = worldPos.clone();
                                            const localQuat = worldQuat.clone();
                                            const localScale = worldScale.clone();
                                            if (parent) {
                                                parent.worldToLocal(localPos);
                                                const parentWorldQuat = parent.getWorldQuaternion(new THREE.Quaternion());
                                                localQuat.premultiply(parentWorldQuat.invert());
                                                const parentWorldScale = parent.getWorldScale(new THREE.Vector3());
                                                localScale.divide(parentWorldScale);
                                            }
                                            const localEuler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');
                                            // Update both selected and root
                                            if (selected) {
                                                setSelected({
                                                    ...selected,
                                                    props: {
                                                        ...selected.props,
                                                        position: [localPos.x, localPos.y, localPos.z],
                                                        rotation: [localEuler.x, localEuler.y, localEuler.z],
                                                        scale: [localScale.x, localScale.y, localScale.z],
                                                    }
                                                });
                                                setRoot(prev => updateNodeById(prev, selected.id, {
                                                    props: {
                                                        position: [localPos.x, localPos.y, localPos.z],
                                                        rotation: [localEuler.x, localEuler.y, localEuler.z],
                                                        scale: [localScale.x, localScale.y, localScale.z],
                                                    }
                                                }));
                                            }
                                        }
                                    }}
                                />
                            )}
                            <ObjectNode node={root} onSelect={setSelected} selectedId={selected?.id} setTransformTarget={setTransformTarget} />
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
    return (
        <EditorProvider>
            <EditorContent />
        </EditorProvider>
    );
}

function EditorContent() {
    const {
        root,
        setRoot,
        selected,
        setSelected,
        handleAdd,
        handleDragStart,
        handleDrop,
        handleUpdateSelected,
        sceneSettings,
        setSceneSettings,
        showSceneDetails,
        setShowSceneDetails,
        sceneText,
        setSceneText,
        handleSceneTextBlur,
        isPlaying,
        setIsPlaying,
        isPaused,
        setIsPaused,
        resetScene,
    } = useEditorContext();
    const { saveSceneForReset } = useEditorContext();
    // Add a key to force remount of EditorCanvas
    const [canvasKey, setCanvasKey] = React.useState(0);

    const handlePlay = () => {
        saveSceneForReset();
        setIsPlaying(true);
        setIsPaused(false);
    };
    const handlePause = () => setIsPaused(v => !v);
    const handleStop = () => {
        setIsPlaying(false); // Ensure isPlaying is false immediately
        setIsPaused(false); // Also reset pause state
        setCanvasKey(k => k + 1); // Remount EditorCanvas/Canvas
    };

    return (
        <>
            <EditorCanvas key={canvasKey} sceneSettings={sceneSettings} />
            <SceneGraphPanel
                root={root}
                selectedId={selected?.id}
                onSelect={setSelected}
                onAdd={handleAdd}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
            />

            <PlaybackControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
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
