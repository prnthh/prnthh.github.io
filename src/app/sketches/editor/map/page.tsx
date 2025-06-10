"use client";

import React, { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ObjectTypes } from "./objectTypes";

// Types for scene graph
export type SceneGraphNode = {
    id: string;
    name: string;
    type: "object" | "spotlight" | "orthographicCamera";
    children: SceneGraphNode[];
    parent: SceneGraphNode | null;
    props: Record<string, any>;
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
    };
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
            <button style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); onAdd(node, "object"); }}>+Obj</button>
            <button style={{ marginLeft: 2 }} onClick={e => { e.stopPropagation(); onAdd(node, "spotlight"); }}>+Spot</button>
            <button style={{ marginLeft: 2 }} onClick={e => { e.stopPropagation(); onAdd(node, "orthographicCamera"); }}>+OrthoCam</button>
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
    if (node.type === "spotlight") {
        return (
            <group ref={ref} name={node.name} position={node.props.position} rotation={node.props.rotation} scale={node.props.scale}>
                <spotLight
                    color={node.props.color || "#ffffff"}
                    intensity={node.props.intensity || 1}
                    position={[0, 0.5, 0]}
                />
                <mesh onClick={e => { e.stopPropagation(); onSelect(node); }}>
                    <coneGeometry args={[0.2, 0.5, 16]} />
                    <meshStandardMaterial color={node.props.color || "#ffffff"} />
                </mesh>
                {node.children.map(child => (
                    <Object3DNode key={child.id} node={child} onSelect={onSelect} />
                ))}
            </group>
        );
    }
    if (node.type === "orthographicCamera") {
        return (
            <group ref={ref} name={node.name} position={node.props.position} rotation={node.props.rotation} scale={node.props.scale}>
                {/* Camera icon */}
                <mesh onClick={e => { e.stopPropagation(); onSelect(node); }}>
                    <boxGeometry args={[0.3, 0.2, 0.2]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                {node.children.map(child => (
                    <Object3DNode key={child.id} node={child} onSelect={onSelect} />
                ))}
            </group>
        );
    }
    // Default object
    return (
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
}

function EntityDetailsPanel({ node, onUpdate }: { node: SceneGraphNode; onUpdate: (updates: Partial<SceneGraphNode>) => void }) {
    const typeDef = ObjectTypes[node.type];
    if (typeDef && typeDef.DetailsView) {
        const DetailsView = typeDef.DetailsView;
        return <DetailsView node={node} onUpdate={onUpdate} />;
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
            {/* Add more generic fields if needed */}
        </div>
    );
}

export default function Home() {
    const [root, setRoot] = useState<SceneGraphNode>(() => createNode("object", "Root"));
    const [selected, setSelected] = useState<SceneGraphNode | null>(null);
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

    return (
        <>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                <Canvas>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <Physics>
                        <group>
                            <Object3DNode node={root} onSelect={node => setSelected(node)} />
                        </group>
                        <gridHelper args={[10, 10, "#888", "#444"]} />
                    </Physics>
                    <OrbitControls />
                </Canvas>
            </div>
            <div style={{ position: "absolute", top: 100, left: 0, width: 300, height: "100%", overflow: "auto", background: "#fff", padding: 16 }}>
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
            {selected && (
                <div style={{ position: "absolute", top: 0, right: 0, width: 300, padding: 16, background: "#fff", borderRight: "1px solid #ddd", height: "100%", overflow: "auto" }}>
                    <h2>Entity Details</h2>
                    <EntityDetailsPanel node={selected} onUpdate={handleUpdateSelected} />
                </div>
            )}
        </>
    );
}
