"use client";

import { Physics, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { GameCanvas } from "@/shared/GameCanvas";
import { DragDropLoader } from "../dragdrop/DragDropLoader";
import React, { ReactElement, useRef, useState } from "react";
import SceneEditor, { type SceneNode } from "./editor/SceneEditor";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { Object3D, Object3DEventMap } from "three";

enum EditorModes {
    Edit = "edit",
    Play = "play",
    Pause = "pause",
}

export default function EditorApp() {
    const [sceneGraph, setSceneGraph] = useState<SceneNode[]>([
        {
            id: Math.random().toString(36).substr(2, 9),
            name: "Root",
            children: [],
            components: [],
        }
    ]);
    const [playMode, setPlayMode] = useState<EditorModes>(EditorModes.Edit);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Map of nodeId to ref
    const nodeRefs = useRef<{ [id: string]: React.RefObject<Object3D<Object3DEventMap> | null> }>({});
    const getNodeRef = (id: string): React.RefObject<Object3D<Object3DEventMap> | null> => {
        if (!nodeRefs.current[id]) nodeRefs.current[id] = React.createRef<Object3D<Object3DEventMap>>();
        return nodeRefs.current[id];
    };
    // Find the selected ref
    const selectedRef = selectedNodeId ? getNodeRef(selectedNodeId) : undefined;

    // Helper to update node transform by id recursively
    function updateNodeTransform(nodes: SceneNode[], id: string, transform: any): SceneNode[] {
        return nodes.map(n => {
            if (n.id === id) {
                return { ...n, transform: { ...n.transform, ...transform } };
            }
            return { ...n, children: updateNodeTransform(n.children, id, transform) };
        });
    }

    // Helper to add a new node to the root's children
    function addModelNodeToSceneGraph(model: any) {
        setSceneGraph(prev => prev.map(root => ({
            ...root,
            children: [
                ...root.children,
                {
                    id: Math.random().toString(36).substr(2, 9),
                    name: model.name || "Model",
                    children: [],
                    components: [
                        { type: 'model', object: model }
                    ],
                    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }
                }
            ]
        })));
    }

    return (
        <>
            <DragDropLoader onModelLoaded={model => addModelNodeToSceneGraph(model)} />
            <div className="w-full items-center justify-items-center min-h-screen bg-black/70" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics paused={true}>
                        <Object3DNode node={sceneGraph[0]} onSelect={setSelectedNodeId} selectedNodeId={selectedNodeId} setSceneGraph={setSceneGraph} getNodeRef={getNodeRef} playMode={playMode} />
                    </Physics>
                    {playMode == EditorModes.Edit && <>
                        <OrbitControls makeDefault />
                        <gridHelper args={[10, 10, 10]} />
                        {/* Top-level TransformControls overlay */}
                        {selectedNodeId && selectedRef && selectedRef.current && (
                            <TransformControls
                                object={selectedRef.current}
                                mode="translate"
                                onObjectChange={() => {
                                    const obj = selectedRef.current;
                                    if (!obj) return;
                                    setSceneGraph(prev => updateNodeTransform(prev, selectedNodeId, {
                                        position: [obj.position.x, obj.position.y, obj.position.z],
                                        // rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                                        // scale: obj.scale.x // assuming uniform scale
                                    }));
                                }}
                            />
                        )}
                    </>}
                    <ambientLight intensity={1} />
                </GameCanvas>
            </div>
            {playMode == EditorModes.Edit && <SceneEditor sceneGraph={sceneGraph} setSceneGraph={setSceneGraph} selectedNodeId={selectedNodeId} setSelectedNodeId={setSelectedNodeId} />}
        </>
    );
}

const Object3DNode = ({ node, onSelect, selectedNodeId, setSceneGraph, getNodeRef, playMode }: { node: SceneNode, onSelect: (id: string) => void, selectedNodeId: string | null, setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>, getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>, playMode: EditorModes }) => {
    return (
        <RigidBodyWrapper node={node} onSelect={onSelect} selectedNodeId={selectedNodeId} setSceneGraph={setSceneGraph} getNodeRef={getNodeRef} playMode={playMode}>
            {node.children.map((child, index) => (
                <Object3DNode key={index} node={child} onSelect={onSelect} selectedNodeId={selectedNodeId} setSceneGraph={setSceneGraph} getNodeRef={getNodeRef} playMode={playMode} />
            ))}
        </RigidBodyWrapper>
    );
}

const ComponentMapper = ({ node }: { node: SceneNode }) => {
    const geometry = node.components?.find(c => c.type === 'boxGeometry');
    const material = node.components?.find(c => c.type === 'meshStandardMaterial');
    const model = node.components?.find(c => c.type === 'model');

    return <>
        {geometry ?
            <boxGeometry args={geometry.args || [0.1, 0.1, 0.1]} /> :
            <boxGeometry args={[0.1, 0.1, 0.1]} />
        }
        {material && <meshStandardMaterial {...material.props} />}
        {model && <primitive object={model.object} />}
    </>
}

const RigidBodyWrapper = ({
    node,
    onSelect,
    selectedNodeId,
    children,
    setSceneGraph,
    getNodeRef,
    playMode // <-- add playMode as prop
}: {
    node: SceneNode,
    onSelect: (id: string) => void,
    selectedNodeId: string | null,
    children?: React.ReactNode,
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>,
    getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>,
    playMode: EditorModes // <-- add playMode as prop
}) => {
    const ref = useRef<RapierRigidBody>(null);
    const groupRef = getNodeRef(node.id);
    const position = node.transform?.position?.map(v => v ?? 0) as [number, number, number] | undefined;
    const rotation = node.transform?.rotation?.map(v => v ?? 0) as [number, number, number] | undefined;
    const scale = node.transform?.scale ?? 1;
    // const isSelected = selectedNodeId === node.id;

    const mesh = (
        <mesh
            onClick={e => {
                e.stopPropagation();
                onSelect(node.id);
            }}
            position={[0, 0, 0]}
            rotation={rotation ? [rotation[0], rotation[1], rotation[2]] : undefined}
            scale={scale}
        >
            <ComponentMapper node={node} />
            {children}
        </mesh>
    );

    if (playMode === EditorModes.Edit) {
        return (
            <group ref={groupRef} position={position || [0, 0, 0]} rotation={rotation} scale={scale}>
                {mesh}
            </group>
        );
    }

    return (
        <RigidBody
            ref={ref}
            colliders="hull"
            position={position || [0, 0, 0]}
            rotation={rotation ? [rotation[0], rotation[1], rotation[2]] : undefined}
            scale={scale}
        >
            <group ref={groupRef}>
                {mesh}
            </group>
        </RigidBody>
    );
};