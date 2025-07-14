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
            className={`ml-4 py-0.5 px-1 transition-all cursor-pointer text-xs font-mono relative ${selectedNodeId === node.id
                ? "bg-blue-500/20 border border-blue-400/40 text-white/95"
                : "text-white/70 hover:bg-white/5 hover:text-white/90"
                }`}
        >
            <span className="select-none">{node.name}</span>
            <button
                className="ml-2 w-4 h-4 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all text-xs"
                onClick={e => { e.stopPropagation(); handleAdd(node.id); }}
                title="Add child node"
            >
                +
            </button>
            {node.children?.map(child => renderNode(child))}
        </div>
    );

    // --- Context menu UI ---
    const contextMenuUI = contextMenu ? (
        <div
            className="fixed bg-black/80 backdrop-blur-md border border-white/20 z-[1000] shadow-2xl min-w-[120px] overflow-hidden"
            style={{
                top: contextMenu.y,
                left: contextMenu.x,
            }}
            onClick={e => e.stopPropagation()}
        >
            <div
                className="px-2 py-1 text-white/80 hover:text-white hover:bg-white/10 cursor-pointer text-xs transition-all border-b border-white/5"
                onClick={() => handleDuplicateNode(contextMenu.nodeId)}
            >
                Duplicate
            </div>
            <div
                className="px-2 py-1 text-red-300 hover:text-red-200 hover:bg-red-500/10 cursor-pointer text-xs transition-all"
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
            <div className="absolute top-24 left-4 bg-black/20 backdrop-blur-md border border-white/10 p-2 min-w-[280px]">
                <div className="flex gap-2 items-center mb-2">
                    <h2 className="text-white/90 text-xs font-medium tracking-wide uppercase">
                        Scene Hierarchy
                    </h2>
                    <button
                        onClick={handleRawToggle}
                        className="text-white/60 hover:text-white/90 text-xs w-5 h-5 flex items-center justify-center transition-colors"
                    >
                        ⛭
                    </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                    {rawMode ? (
                        <div className="flex flex-col gap-3">
                            <div>
                                <div className="text-white/70 text-xs font-medium mb-2 tracking-wider">MODELS</div>
                                <div className="flex flex-col gap-1">
                                    {Object.keys(models).length === 0
                                        ? <div className="text-white/40 text-xs">No models loaded.</div>
                                        : Object.entries(models).map(([filename, model]) => (
                                            <div key={filename} className="flex items-center justify-between py-0.5 px-1 bg-white/5 border border-white/5">
                                                <span className="text-white/80 text-xs font-mono truncate">
                                                    {filename}
                                                </span>
                                                {model === null ? (
                                                    <span className="text-red-400 text-xs font-medium">Missing</span>
                                                ) : (
                                                    <button
                                                        className="text-xs px-1 py-0.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white/90 border border-white/10 transition-all"
                                                        onClick={() => handleDownloadModel(model, filename)}
                                                    >
                                                        ↓
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    }
                                    {/* Show only one button for all missing files */}
                                    {Object.values(models).some(m => m === null) && (
                                        <div className="mt-3 flex flex-col items-center gap-2">
                                            <div className="text-red-300 text-xs font-medium">Import missing files:</div>
                                            {/* Show only one button for all missing files */}
                                            <FilePicker onModelLoaded={handleModelLoaded} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-white/70 text-xs font-medium mb-2 tracking-wider">SCENE GRAPH</div>
                                <textarea
                                    value={rawText}
                                    onChange={handleRawChange}
                                    onBlur={handleRawBlur}
                                    onKeyDown={handleRawKeyDown}
                                    className="w-full h-80 bg-black/30 border border-white/10 text-white/90 text-xs font-mono p-2 resize-none focus:outline-none focus:border-white/30 transition-colors"
                                    placeholder="Scene graph JSON..."
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
