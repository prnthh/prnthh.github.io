import { DragDropLoader } from "../../dragdrop/DragDropLoader";
import React, { useEffect, useRef, useState, useContext, createContext, useMemo } from "react";
import SceneEditor from "../editor/SceneEditor";
import { Object3D, Object3DEventMap, Scene } from "three";
import { EditorModes, SceneNode, Viewer } from "../viewer/SceneViewer";
import { loadModel } from "../../dragdrop/modelLoader";

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
    isLoadingAssets: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function useEditorContext() {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditorContext must be used within EditorContext.Provider");
    return ctx;
}

export function GameEngine({ resourcePath = "", mode = EditorModes.Play, sceneGraph: initialSceneGraph, children }: { resourcePath?: string, mode?: EditorModes, sceneGraph?: SceneNode[], children?: React.ReactNode }) {
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
    const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(false);

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
        // Set loading flag when adding model
        setIsLoadingAssets(true);

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

        // Clear loading flag after a brief delay
        setTimeout(() => setIsLoadingAssets(false), 100);
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

        // Determine which files need to be loaded
        const filesToLoad = Array.from(referencedFiles).filter(filename => {
            const model = models[filename];
            return !model || model.missing;
        });

        // If no files need loading, exit early
        if (filesToLoad.length === 0) {
            return;
        }

        // Set loading flag
        setIsLoadingAssets(true);

        // Mark missing models
        setModels(prevModels => {
            const newModels = { ...prevModels };
            filesToLoad.forEach(filename => {
                if (!(filename in newModels)) {
                    newModels[filename] = { missing: true };
                }
            });
            return newModels;
        });

        // Track loading progress with a ref to avoid closure issues
        let loadedCount = 0;
        const totalToLoad = filesToLoad.length;

        const onLoadComplete = () => {
            loadedCount++;
            console.log(`Loaded ${loadedCount}/${totalToLoad} models`);
            if (loadedCount >= totalToLoad) {
                setIsLoadingAssets(false);
            }
        };

        // Load only the files that need loading
        filesToLoad.forEach(filename => {
            // Use the loadModel utility which handles path construction
            loadModel(filename, resourcePath).then(result => {
                if (result.success && result.model) {
                    setModels(prev => ({ ...prev, [filename]: result.model }));
                } else {
                    console.error(`Failed to load model ${filename}:`, result.error);
                    setModels(prev => ({ ...prev, [filename]: { missing: true, error: result.error } }));
                }
                onLoadComplete();
            }).catch(error => {
                console.error(`Error loading model ${filename}:`, error);
                setModels(prev => ({ ...prev, [filename]: { missing: true, error: error.message } }));
                onLoadComplete();
            });
        });
    };
    // Run once on mount
    React.useEffect(() => {
        scanAndLoadMissingModels();
    }, []);

    return (
        <EditorContext.Provider value={useMemo(() => ({ sceneGraph, setSceneGraph, models, setModels, playMode, setPlayMode, selectedNodeId, setSelectedNodeId, getNodeRef, scanAndLoadMissingModels, sceneRef, isLoadingAssets }), [sceneGraph, models, playMode, setPlayMode, selectedNodeId, isLoadingAssets])}>
            {playMode == EditorModes.Edit && <DragDropLoader onModelLoaded={(model, filename) => addModelNodeToSceneGraph(model, filename)} />}
            <div className="w-full items-center justify-items-center min-h-screen" style={{ height: "100vh" }}>
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