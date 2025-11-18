import { DragDropLoader } from "../../dragdrop/DragDropLoader";
import React, { useEffect, useRef, useState, useContext, createContext, useMemo } from "react";
import SceneEditor from "../editor/SceneEditor";
import { Object3D, Object3DEventMap, Scene, Vector3 } from "three";
import { EditorModes, SceneNode, Viewer } from "../viewer/SceneViewer";
import { GLTFLoader, FBXLoader, DRACOLoader } from "three/examples/jsm/Addons.js";

interface EditorContextType {
    sceneGraph: SceneNode[];
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
    models: { [filename: string]: any };
    setModels: React.Dispatch<React.SetStateAction<{ [filename: string]: any }>>;
    playMode: EditorModes;
    setPlayMode: React.Dispatch<React.SetStateAction<EditorModes>>;
    selectedNodeId: string | null;
    setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>;
    scanAndLoadMissingModels: (customSceneGraph?: SceneNode[]) => void;
    sceneRef: React.RefObject<Scene | null>;
    loadRadius: number;
    unloadRadius: number;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function useEditorContext() {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditorContext must be used within EditorContext.Provider");
    return ctx;
}

function calculateNetPosition(node: SceneNode, parentPosition: [number, number, number] = [0, 0, 0]): [number, number, number] {
    const nodePos = node.transform?.position || [0, 0, 0];
    return [
        (parentPosition[0] ?? 0) + (nodePos[0] ?? 0),
        (parentPosition[1] ?? 0) + (nodePos[1] ?? 0),
        (parentPosition[2] ?? 0) + (nodePos[2] ?? 0),
    ];
}

function isLeafNode(node: SceneNode): boolean {
    return !node.children || node.children.length === 0;
}

function calculateDistance(pos1: [number, number, number], pos2: Vector3): number {
    return Math.sqrt(
        Math.pow(pos1[0] - pos2.x, 2) +
        Math.pow(pos1[1] - pos2.y, 2) +
        Math.pow(pos1[2] - pos2.z, 2)
    );
}

export function filterNodesByRadius(nodes: SceneNode[], viewerPos: Vector3, loadRadius: number, unloadRadius: number, parentPosition: [number, number, number] = [0, 0, 0]): SceneNode[] {
    return nodes.map(node => {
        const netPosition = calculateNetPosition(node, parentPosition);
        const distance = calculateDistance(netPosition, viewerPos);

        if (isLeafNode(node)) {
            return distance <= loadRadius ? node : null;
        }

        return {
            ...node,
            children: node.children ? filterNodesByRadius(node.children, viewerPos, loadRadius, unloadRadius, netPosition) : []
        };
    }).filter((node): node is SceneNode => node !== null);
}

export function GameEngine({ resourcePath = "", mode = EditorModes.Play, sceneGraph: initialSceneGraph, children, loadRadius = Infinity, unloadRadius = Infinity }: { resourcePath?: string, mode?: EditorModes, sceneGraph?: SceneNode[], children?: React.ReactNode, loadRadius?: number, unloadRadius?: number }) {
    const [sceneGraph, setSceneGraph] = useState<SceneNode[]>(
        initialSceneGraph ??
        [{
            id: Math.random().toString(36).substr(2, 9),
            name: "Root",
            children: [],
            components: [],
        }]
    );

    // Update sceneGraph if initialSceneGraph changes
    useEffect(() => {
        if (initialSceneGraph) {
            setSceneGraph(initialSceneGraph);
            scanAndLoadMissingModels(initialSceneGraph);
        }
    }, [initialSceneGraph]);
    // Store models as a map: filename -> model
    const [models, setModels] = useState<{ [filename: string]: any }>({});
    const [playMode, setPlayMode] = useState<EditorModes>(mode);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    useEffect(() => {
        setPlayMode(mode);
    }, [mode]);

    // Map of nodeId to ref
    const nodeRefs = useRef<{ [id: string]: React.RefObject<Object3D<Object3DEventMap> | null> }>({});
    const getNodeRef = (id: string): React.RefObject<Object3D<Object3DEventMap> | null> => {
        if (!nodeRefs.current[id]) nodeRefs.current[id] = React.createRef<Object3D<Object3DEventMap>>();
        return nodeRefs.current[id];
    };

    // Scene ref for exporting
    const sceneRef = useRef<Scene | null>(null);

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

    // --- Scan and load missing models ---
    const scanAndLoadMissingModels = (customSceneGraph?: SceneNode[]) => {
        console.log("Scanning for missing models...");
        const graph = customSceneGraph || sceneGraph;
        const referencedFiles = new Set<string>();
        function collectModelFiles(nodes: SceneNode[]) {
            nodes.forEach(node => {
                if (node.components) {
                    node.components.forEach(comp => {
                        if (comp.type === 'model' && comp.filename) {
                            referencedFiles.add(comp.filename);
                        }
                    });
                }
                if (node.children && node.children.length > 0) {
                    collectModelFiles(node.children);
                }
            });
        }
        collectModelFiles(graph);

        // Mark missing models
        setModels(prevModels => {
            const newModels = { ...prevModels };
            referencedFiles.forEach(filename => {
                if (!(filename in newModels)) {
                    newModels[filename] = { missing: true };
                }
            });
            return newModels;
        });

        // Defer model loading to prevent canvas initialization race conditions
        setTimeout(() => {
            referencedFiles.forEach(filename => {
                // Check current models state to avoid race conditions
                setModels(currentModels => {
                    if (currentModels[filename] && !currentModels[filename].missing) {
                        return currentModels; // Already loaded
                    }

                    if (filename.endsWith('.glb') || filename.endsWith('.gltf')) {
                        const loader = new GLTFLoader();
                        const dracoLoader = new DRACOLoader();
                        dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
                        loader.setDRACOLoader(dracoLoader);
                        loader.load(`${resourcePath}/${filename}`,
                            gltf => {
                                setModels(prev => ({ ...prev, [filename]: gltf.scene }));
                            },
                            undefined,
                            err => {
                                setModels(prev => ({ ...prev, [filename]: { missing: true, error: err } }));
                            }
                        );
                    } else if (filename.endsWith('.fbx')) {
                        const loader = new FBXLoader();
                        loader.load(`${resourcePath}/${filename}`,
                            model => {
                                setModels(prev => ({ ...prev, [filename]: model }));
                            },
                            undefined,
                            err => {
                                setModels(prev => ({ ...prev, [filename]: { missing: true, error: err } }));
                            }
                        );
                    }

                    return currentModels;
                });
            });
        }, 100); // Small delay to let canvas initialize
    };
    // Run once on mount
    React.useEffect(() => {
        scanAndLoadMissingModels();
    }, []);

    return (
        <EditorContext.Provider value={useMemo(() => ({ sceneGraph, setSceneGraph, models, setModels, playMode, setPlayMode, selectedNodeId, setSelectedNodeId, getNodeRef, scanAndLoadMissingModels, sceneRef, loadRadius, unloadRadius }), [sceneGraph, models, playMode, setPlayMode, selectedNodeId, loadRadius, unloadRadius])}>
            {playMode == EditorModes.Edit && <DragDropLoader onModelLoaded={(model, filename) => addModelNodeToSceneGraph(model, filename)} />}
            <div className="w-full items-center justify-items-center min-h-screen bg-black/70" style={{ height: "100vh" }}>
                {children}
            </div>
            {playMode == EditorModes.Edit && <SceneEditor
                sceneGraph={sceneGraph} // pass raw sceneGraph
                setSceneGraph={setSceneGraph}
                selectedNodeId={selectedNodeId}
                setSelectedNodeId={setSelectedNodeId}
                models={models}
                setModels={setModels}
            />}
        </EditorContext.Provider>
    );
}