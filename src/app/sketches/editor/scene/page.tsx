"use client";

import { Physics } from "@react-three/rapier";
import { GameCanvas } from "@/shared/GameCanvas";
import { DragDropLoader } from "../dragdrop/DragDropLoader";
import React, { useEffect, useRef, useState } from "react";
import SceneEditor from "./editor/SceneEditor";
import { OrbitControls, Stats, TransformControls } from "@react-three/drei";
import { Object3D, Object3DEventMap } from "three";
import Object3DNode, { EditorModes, SceneNode } from "./editor/SceneViewer";
import { GameInstance, GameInstanceProvider } from "./editor/InstanceProvider";
import { Perf } from 'r3f-perf'

export default function EditorApp() {
    const [sceneGraph, setSceneGraph] = useState<SceneNode[]>([
        {
            id: Math.random().toString(36).substr(2, 9),
            name: "Root",
            children: [],
            components: [],
        }
    ]);
    // Store models as a map: filename -> model
    const [models, setModels] = useState<{ [filename: string]: any }>({});
    const [playMode, setPlayMode] = useState<EditorModes>(EditorModes.Edit);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    useEffect(() => {
        console.log("Scene graph updated:", sceneGraph);
    }, [sceneGraph]);

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

    function addModelNodeToSceneGraph(model: any, filename: string) {
        // Always store the model in models state by filename
        setModels(prevModels => ({
            ...prevModels,
            [filename]: model
        }));
        // Only store the filename in the scene graph node
        setSceneGraph(prev => {
            const root = prev[0];
            const newNode: SceneNode = {
                id: Math.random().toString(36).substr(2, 9),
                name: filename,
                children: [],
                components: [
                    { type: 'model', filename } // Only filename, no model object
                ],
                transform: {
                    position: [0, 0, 0] as [number, number, number],
                    rotation: [0, 0, 0] as [number, number, number],
                    scale: 1
                }
            };
            return [
                {
                    ...root,
                    children: [...root.children, newNode]
                }
            ] as SceneNode[];
        });
    }

    function injectModels(nodes: SceneNode[], models: { [filename: string]: any }): SceneNode[] {
        return nodes.map(node => {
            const newComponents = node.components?.map((comp: any) => {
                if (comp.type === 'model' && typeof comp.filename === 'string') {
                    return { ...comp, object: models[comp.filename] };
                }
                return comp;
            }) ?? [];
            return {
                ...node,
                components: newComponents,
                children: injectModels(node.children, models)
            };
        });
    }

    return (
        <>
            <DragDropLoader onModelLoaded={(model, filename) => addModelNodeToSceneGraph(model, filename)} />
            <div className="w-full items-center justify-items-center min-h-screen bg-black/70" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Perf />
                    <GameInstanceProvider>
                        <GameInstance
                            modelUrl="/models/environment/tree.glb"
                            position={[2, 0, 0]}
                            rotation={[0, 0, 0]}
                        />
                        <GameInstance
                            modelUrl="/models/environment/shoe.glb"
                            position={[4, 0, 0]}
                            rotation={[0, 0, 0]}
                        />
                        <GameInstance
                            modelUrl="/models/environment/shoe.glb"
                            position={[3, 0, 0]}
                            rotation={[0, 0, 0]}
                        />
                        <GameInstance
                            modelUrl="/models/environment/shoe.glb"
                            position={[3, 0, 0]}
                            rotation={[0, 0, 0]}
                        />
                    </GameInstanceProvider>

                    <Physics paused={true}>
                        <Object3DNode
                            node={injectModels(sceneGraph, models)[0]} // inject models inline for rendering
                            onSelect={setSelectedNodeId}
                            selectedNodeId={selectedNodeId}
                            setSceneGraph={setSceneGraph}
                            getNodeRef={getNodeRef}
                            playMode={playMode}
                        />
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
            {playMode == EditorModes.Edit && <SceneEditor
                sceneGraph={sceneGraph} // pass raw sceneGraph
                setSceneGraph={setSceneGraph}
                selectedNodeId={selectedNodeId}
                setSelectedNodeId={setSelectedNodeId}
                models={models}
                setModels={setModels}
            />}
        </>
    );
}
