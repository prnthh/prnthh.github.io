import React, { useRef, useState } from "react";
import NodeEditor from "./NodeEditor";
import { SceneNode } from "../viewer/SceneViewer";
import { FilePicker } from "../../dragdrop/DragDropLoader";

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- Tree helpers ---
export function removeNodeById(nodes: SceneNode[], id: string): [SceneNode[], SceneNode | null] {
    let removed: SceneNode | null = null;
    const recur = (arr: SceneNode[]): SceneNode[] =>
        arr.reduce<SceneNode[]>((acc, node) => {
            if (node.id === id) {
                removed = node;
                return acc;
            }
            const [newChildren, childRemoved] = removeNodeById(node.children, id);
            if (childRemoved) removed = childRemoved;
            acc.push({ ...node, children: newChildren });
            return acc;
        }, []);
    return [recur(nodes), removed];
}

function addNodeToParent(nodes: SceneNode[], parentId: string, child: SceneNode): SceneNode[] {
    return nodes.map(node =>
        node.id === parentId
            ? { ...node, children: [...node.children, child] }
            : { ...node, children: addNodeToParent(node.children, parentId, child) }
    );
}

function isDescendant(nodes: SceneNode[], nodeId: string, targetId: string): boolean {
    for (const node of nodes) {
        if (node.id === nodeId) {
            const search = (n: SceneNode): boolean => {
                if (n.id === targetId) return true;
                return n.children.some(search);
            };
            return node.children.some(search);
        }
        if (isDescendant(node.children, nodeId, targetId)) return true;
    }
    return false;
}

interface SceneEditorProps {
    sceneGraph: SceneNode[];
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
    selectedNodeId: string | null;
    setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    models: { [filename: string]: any };
    setModels?: React.Dispatch<React.SetStateAction<{ [filename: string]: any }>>; // <-- add this line
}

export default function SceneEditor({ sceneGraph, setSceneGraph, selectedNodeId, setSelectedNodeId, models, setModels }: SceneEditorProps) {
    const [rawMode, setRawMode] = useState(false);
    const [rawText, setRawText] = useState<string>("");
    const dragNode = useRef<SceneNode | null>(null);
    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ nodeId: string, x: number, y: number } | null>(null);

    // --- Add node ---
    const handleAdd = (parentId?: string) => {
        const id = generateId();
        const newNode: SceneNode = {
            id,
            name: `Node-${id}`,
            children: [],
            components: [], // Initialize components
        };
        setSceneGraph(prev => {
            if (!parentId) return [...prev, newNode];
            const addChild = (nodes: SceneNode[]): SceneNode[] =>
                nodes.map(node =>
                    node.id === parentId
                        ? { ...node, children: [...node.children, newNode] }
                        : { ...node, children: addChild(node.children) }
                );
            return addChild(prev);
        });
    };

    // --- Drag and drop logic ---
    const handleDragStart = (node: SceneNode) => {
        dragNode.current = node;
    };
    const handleDrop = (targetNode: SceneNode) => {
        if (!dragNode.current || dragNode.current.id === targetNode.id) return;
        // Prevent dropping onto a descendant
        if (isDescendant(sceneGraph, dragNode.current.id, targetNode.id)) return;
        // Remove from old parent
        const [without, removed] = removeNodeById(sceneGraph, dragNode.current.id);
        if (!removed) return;
        // Add to new parent
        const newTree = addNodeToParent(without, targetNode.id, removed);
        setSceneGraph(newTree);
        dragNode.current = null;
    };

    // --- Raw mode handlers ---
    const handleRawToggle = () => {
        if (!rawMode) {
            setRawText(JSON.stringify(sceneGraph, null, 2));
        }
        setRawMode(r => !r);
    };
    const handleRawChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRawText(e.target.value);
    };
    const handleRawBlur = () => {
        try {
            const parsed = JSON.parse(rawText);
            if (Array.isArray(parsed)) {
                setSceneGraph(parsed);

                // --- Ensure models contains all referenced filenames ---
                if (setModels) {
                    function collectModelFilenames(nodes: SceneNode[]): Set<string> {
                        const filenames = new Set<string>();
                        const recur = (nlist: SceneNode[]) => {
                            nlist.forEach(node => {
                                node.components?.forEach((comp: any) => {
                                    if (comp.type === 'model' && typeof comp.filename === 'string') {
                                        filenames.add(comp.filename);
                                    }
                                });
                                recur(node.children);
                            });
                        };
                        recur(parsed);
                        return filenames;
                    }

                    const referencedFilenames = collectModelFilenames(parsed);
                    setModels(prevModels => {
                        let changed = false;
                        const newModels = { ...prevModels };
                        referencedFilenames.forEach(filename => {
                            if (!(filename in newModels)) {
                                newModels[filename] = null;
                                changed = true;
                            }
                        });
                        return changed ? newModels : prevModels;
                    });
                }
            }
        } catch { }
    };
    const handleRawKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            handleRawBlur();
        }
    };

    // --- Download model handler ---
    const handleDownloadModel = (model: any, filename: string) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(model, null, 2));
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = filename.replace(/\.[^/.]+$/, "") + ".json";
        anchor.click();
    };

    // --- Add model handler ---
    const handleModelLoaded = (model: any, filename: string) => {
        if (setModels) {
            setModels(prevModels => ({
                ...prevModels,
                [filename]: model
            }));
        }
    };

    // --- Delete node ---
    const handleDeleteNode = (nodeId: string) => {
        setSceneGraph(prev => {
            const [newGraph] = removeNodeById(prev, nodeId);
            return newGraph;
        });
        setContextMenu(null);
        if (selectedNodeId === nodeId) setSelectedNodeId(null);
    };

    // --- Duplicate node ---
    function deepCloneNode(node: SceneNode): SceneNode {
        return {
            ...node,
            id: generateId(),
            components: node.components ? JSON.parse(JSON.stringify(node.components)) : [],
            children: node.children?.map(deepCloneNode) || [],
        };
    }
    const handleDuplicateNode = (nodeId: string) => {
        setSceneGraph(prev => {
            // Find parent and index of nodeId
            function recur(nodes: SceneNode[]): SceneNode[] {
                return nodes.flatMap(node => {
                    if (node.id === nodeId) {
                        // Duplicate as sibling after original
                        const clone = deepCloneNode(node);
                        return [node, clone];
                    }
                    return [{
                        ...node,
                        children: recur(node.children)
                    }];
                });
            }
            return recur(prev);
        });
        setContextMenu(null);
    };

    // --- Render tree ---
    const renderNode = (node: SceneNode) => (
        <div
            key={node.id}
            draggable
            onDragStart={e => {
                e.stopPropagation();
                handleDragStart(node);
            }}
            onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                handleDrop(node);
            }}
            onDragOver={e => e.preventDefault()}
            onClick={e => {
                e.stopPropagation();
                setSelectedNodeId(node.id);
            }}
            onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
            }}
            style={{
                marginLeft: 16,
                border: selectedNodeId === node.id ? "1px solid #4f8cff" : undefined,
                background: selectedNodeId === node.id ? "#e6f0ff" : undefined,
                padding: 2,
                cursor: "pointer",
                position: "relative"
            }}
        >
            {node.name}
            <button style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); handleAdd(node.id); }}>+</button>
            {node.children?.map(child => renderNode(child))}
        </div>
    );

    // --- Context menu UI ---
    const contextMenuUI = contextMenu ? (
        <div
            style={{
                position: "fixed",
                top: contextMenu.y,
                left: contextMenu.x,
                background: "white",
                border: "1px solid #ccc",
                borderRadius: 4,
                zIndex: 1000,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                minWidth: 100
            }}
            onClick={e => e.stopPropagation()}
        >
            <div
                style={{ padding: 8, cursor: "pointer" }}
                onClick={() => handleDuplicateNode(contextMenu.nodeId)}
            >
                Duplicate
            </div>
            <div
                style={{ padding: 8, cursor: "pointer", color: "red" }}
                onClick={() => handleDeleteNode(contextMenu.nodeId)}
            >
                Delete
            </div>
        </div>
    ) : null;

    // --- Dismiss context menu on click elsewhere ---
    React.useEffect(() => {
        if (!contextMenu) return;
        const handle = () => setContextMenu(null);
        window.addEventListener("click", handle);
        return () => window.removeEventListener("click", handle);
    }, [contextMenu]);

    return (
        <>
            <div className="absolute top-24 left-4 bg-white rounded p-1">
                <div className="flex gap-2 items-center">
                    <h2>
                        Scene Hierarchy
                    </h2>
                    <button onClick={handleRawToggle}>⛭</button>
                </div>
                <div>
                    {rawMode ? (
                        <div className="flex flex-col gap-2">
                            <div>
                                <div style={{ fontWeight: "bold" }}>Models</div>
                                <div className="flex flex-col">
                                    {Object.keys(models).length === 0
                                        ? <div style={{ color: "#888" }}>No models loaded.</div>
                                        : Object.entries(models).map(([filename, model]) => (
                                            <div key={filename} className="flex items-center mb-1">
                                                <span>
                                                    {filename}
                                                </span>
                                                {model === null ? (
                                                    <span className="text-red-600 ml-2">Missing</span>
                                                ) : (
                                                    <button
                                                        className="ml-2 text-xs px-2 py-0.5 border rounded bg-white hover:bg-blue-50"
                                                        onClick={() => handleDownloadModel(model, filename)}
                                                    >
                                                        Download
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    }
                                    {/* Show only one button for all missing files */}
                                    {Object.values(models).some(m => m === null) && (
                                        <div className="mt-2 flex flex-col items-center">
                                            <div className="text-red-700 font-bold">Import missing files:</div>
                                            {/* Show only one button for all missing files */}
                                            <FilePicker onModelLoaded={handleModelLoaded} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontWeight: "bold" }}>SceneGraph</div>
                                <textarea
                                    value={rawText}
                                    onChange={handleRawChange}
                                    onBlur={handleRawBlur}
                                    onKeyDown={handleRawKeyDown}
                                    style={{ width: 400, height: 300, fontFamily: 'monospace', fontSize: 14 }}
                                />
                            </div>
                        </div>
                    ) : (
                        sceneGraph.map(node => renderNode(node))
                    )}
                </div>
            </div>
            {contextMenuUI}
            <NodeEditor
                selectedId={selectedNodeId}
                sceneGraph={sceneGraph}
                setSceneGraph={setSceneGraph}
                models={models}
            />
        </>
    );
}
