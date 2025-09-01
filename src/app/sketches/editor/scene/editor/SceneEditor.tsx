import React, { useRef, useState, useCallback } from "react";
import NodeEditor from "./NodeEditor";
import { SceneNode } from "../viewer/SceneViewer";
import { FilePicker } from "../../dragdrop/DragDropLoader";
import presets from "../presets";
import { useEditorContext } from "./EditorContext";
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- History management for undo/redo ---
interface HistoryState {
    sceneGraph: SceneNode[];
    selectedNodeId: string | null;
}

class HistoryManager {
    private history: HistoryState[] = [];
    private currentIndex = -1;
    private maxHistorySize = 50;

    saveState(sceneGraph: SceneNode[], selectedNodeId: string | null) {
        // Remove any history after current index (when user made new changes after undo)
        this.history = this.history.slice(0, this.currentIndex + 1);

        // Add new state
        this.history.push({
            sceneGraph: JSON.parse(JSON.stringify(sceneGraph)), // deep clone
            selectedNodeId
        });

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }
    }

    canUndo(): boolean {
        return this.currentIndex > 0;
    }

    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    undo(): HistoryState | null {
        if (this.canUndo()) {
            this.currentIndex--;
            return this.history[this.currentIndex];
        }
        return null;
    }

    redo(): HistoryState | null {
        if (this.canRedo()) {
            this.currentIndex++;
            return this.history[this.currentIndex];
        }
        return null;
    }

    clear() {
        this.history = [];
        this.currentIndex = -1;
    }
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

function moveNodeInArray(nodes: SceneNode[], nodeId: string, newIndex: number): SceneNode[] {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return nodes;

    const newNodes = [...nodes];
    const [movedNode] = newNodes.splice(nodeIndex, 1);
    newNodes.splice(newIndex, 0, movedNode);
    return newNodes;
}

function reorderNodeInParent(nodes: SceneNode[], nodeId: string, newIndex: number, parentId?: string): SceneNode[] {
    if (!parentId) {
        // Moving at root level
        return moveNodeInArray(nodes, nodeId, newIndex);
    }

    return nodes.map(node => {
        if (node.id === parentId) {
            return { ...node, children: moveNodeInArray(node.children, nodeId, newIndex) };
        }
        return { ...node, children: reorderNodeInParent(node.children, nodeId, newIndex, parentId) };
    });
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
    const { scanAndLoadMissingModels, sceneRef } = useEditorContext();
    const [rawMode, setRawMode] = useState(false);
    const dragNode = useRef<SceneNode | null>(null);
    const dragOverInfo = useRef<{ nodeId: string; position: 'before' | 'after' | 'into' } | null>(null);
    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ nodeId: string, x: number, y: number } | null>(null);
    // Collapsed nodes state
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
    // History manager
    const historyManager = useRef(new HistoryManager());
    const [, forceUpdate] = useState({});

    // Download GLB function
    const handleDownloadGLB = useCallback(() => {
        if (!sceneRef.current) {
            alert('Scene not available');
            return;
        }
        const exporter = new GLTFExporter();
        exporter.parse(
            sceneRef.current,
            function (result) {
                if (result instanceof ArrayBuffer) {
                    saveArrayBuffer(result, 'scene.glb');
                } else {
                    console.log('Unexpected result type:', result);
                }
            },
            function (error) {
                console.error('Error exporting GLTF:', error);
            },
            { binary: true }
        );
    }, [sceneRef]);

    const saveArrayBuffer = (buffer: ArrayBuffer, filename: string) => {
        save(new Blob([buffer], { type: 'application/octet-stream' }), filename);
    };

    const save = (blob: Blob, filename: string) => {
        const link = document.createElement('a');
        link.style.display = 'none';
        document.body.appendChild(link); // Firefox workaround
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        document.body.removeChild(link);
    };

    // Save current state to history
    const saveToHistory = useCallback(() => {
        historyManager.current.saveState(sceneGraph, selectedNodeId);
        forceUpdate({}); // Force re-render to update button states
    }, [sceneGraph, selectedNodeId]);

    // Initialize history with current state
    React.useEffect(() => {
        if (historyManager.current.canUndo() === false && historyManager.current.canRedo() === false) {
            historyManager.current.saveState(sceneGraph, selectedNodeId);
        }
    }, []);

    // Track changes from NodeEditor and save to history
    const prevSceneGraph = useRef<SceneNode[]>(sceneGraph);
    React.useEffect(() => {
        // Only save if sceneGraph actually changed (not just re-renders)
        if (JSON.stringify(prevSceneGraph.current) !== JSON.stringify(sceneGraph)) {
            // Small delay to batch rapid changes from NodeEditor
            const timer = setTimeout(() => {
                historyManager.current.saveState(sceneGraph, selectedNodeId);
                forceUpdate({});
            }, 500);

            prevSceneGraph.current = sceneGraph;
            return () => clearTimeout(timer);
        }
    }, [sceneGraph, selectedNodeId]);

    // Undo functionality
    const handleUndo = useCallback(() => {
        const prevState = historyManager.current.undo();
        if (prevState) {
            setSceneGraph(prevState.sceneGraph);
            setSelectedNodeId(prevState.selectedNodeId);
            forceUpdate({}); // Force re-render to update button states
        }
    }, [setSceneGraph, setSelectedNodeId]);

    // Redo functionality  
    const handleRedo = useCallback(() => {
        const nextState = historyManager.current.redo();
        if (nextState) {
            setSceneGraph(nextState.sceneGraph);
            setSelectedNodeId(nextState.selectedNodeId);
            forceUpdate({}); // Force re-render to update button states
        }
    }, [setSceneGraph, setSelectedNodeId]);

    // Keyboard shortcuts for undo/redo
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    // --- Add node ---
    const handleAdd = (parentId?: string) => {
        saveToHistory(); // Save state before making changes
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

    // --- Enhanced drag and drop logic with reordering ---
    const handleDragStart = (node: SceneNode) => {
        dragNode.current = node;
    };

    const handleDragOver = (e: React.DragEvent, targetNode: SceneNode) => {
        e.preventDefault();
        if (!dragNode.current || dragNode.current.id === targetNode.id) return;

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;

        // Determine drop position based on mouse position
        if (y < height * 0.25) {
            dragOverInfo.current = { nodeId: targetNode.id, position: 'before' };
        } else if (y > height * 0.75) {
            dragOverInfo.current = { nodeId: targetNode.id, position: 'after' };
        } else {
            dragOverInfo.current = { nodeId: targetNode.id, position: 'into' };
        }
    };

    const handleDrop = (e: React.DragEvent, targetNode: SceneNode) => {
        e.preventDefault();
        e.stopPropagation();

        if (!dragNode.current || !dragOverInfo.current || dragNode.current.id === targetNode.id) {
            dragOverInfo.current = null;
            return;
        }

        // Prevent dropping onto a descendant
        if (isDescendant(sceneGraph, dragNode.current.id, targetNode.id)) {
            dragOverInfo.current = null;
            return;
        }

        saveToHistory(); // Save state before making changes

        const { position } = dragOverInfo.current;

        // Remove from old parent
        const [without, removed] = removeNodeById(sceneGraph, dragNode.current.id);
        if (!removed) {
            dragOverInfo.current = null;
            return;
        }

        let newTree: SceneNode[];

        if (position === 'into') {
            // Add as child to target node
            newTree = addNodeToParent(without, targetNode.id, removed);
        } else {
            // Find target's parent and siblings to insert before/after
            const insertIntoSiblings = (nodes: SceneNode[], parentId?: string): SceneNode[] => {
                const targetIndex = nodes.findIndex(n => n.id === targetNode.id);
                if (targetIndex !== -1) {
                    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
                    const newNodes = [...nodes];
                    newNodes.splice(insertIndex, 0, removed);
                    return newNodes;
                }

                // Search in children
                return nodes.map(node => ({
                    ...node,
                    children: insertIntoSiblings(node.children, node.id)
                }));
            };

            newTree = insertIntoSiblings(without);
        }

        setSceneGraph(newTree);
        dragNode.current = null;
        dragOverInfo.current = null;
    };

    // --- Raw mode handlers ---
    const handleRawToggle = () => {
        setRawMode(r => !r);
    };

    // --- Save JSON handler ---
    const handleSaveJSON = () => {
        const jsonString = JSON.stringify(sceneGraph, null, 2);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const anchor = document.createElement('a');
        anchor.href = dataStr;
        anchor.download = "scene-graph.json";
        anchor.click();
    };

    // --- Load JSON handler ---
    const handleLoadJSON = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const jsonString = event.target?.result as string;
                        const parsed = JSON.parse(jsonString);
                        if (Array.isArray(parsed)) {
                            saveToHistory(); // Save state before loading
                            setSceneGraph(parsed);
                            // Scan and load missing models for loaded JSON
                            if (scanAndLoadMissingModels) {
                                scanAndLoadMissingModels(parsed);
                            }
                        }
                    } catch (error) {
                        alert('Error parsing JSON file');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // --- Load preset handler ---
    const handleLoadPreset = (presetName: string) => {
        if (presetName && presets[presetName as keyof typeof presets]) {
            saveToHistory(); // Save state before loading
            const presetData = presets[presetName as keyof typeof presets] as SceneNode[];
            setSceneGraph(presetData);
            // After setting sceneGraph, scan and load missing models
            if (scanAndLoadMissingModels) {
                scanAndLoadMissingModels(presetData)
            }
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
        saveToHistory(); // Save state before making changes
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
        saveToHistory(); // Save state before making changes
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

    // --- Toggle collapse state ---
    const toggleCollapse = (nodeId: string) => {
        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    // --- Render tree ---
    const renderNode = (node: SceneNode) => {
        const hasChildren = node.children && node.children.length > 0;
        const isCollapsed = collapsedNodes.has(node.id);
        const isDragOver = dragOverInfo.current?.nodeId === node.id;
        const dragPosition = dragOverInfo.current?.position;

        // Check if any child is being dragged over with 'into' position (becoming a child)
        const isReceivingChild = isDragOver && dragPosition === 'into';

        // Build classes dynamically based on state
        const nodeClasses = [
            "ml-4 p-0.5 cursor-pointer relative flex items-center gap-1",
            // Selection state
            selectedNodeId === node.id ? "border border-blue-500 bg-blue-50" : "",
            // Drag feedback for reordering
            isDragOver && dragPosition === 'before' ? "border-t-2 border-t-blue-500" : "",
            isDragOver && dragPosition === 'after' ? "border-b-2 border-b-blue-500" : "",
            // Highlight when receiving a child
            isReceivingChild ? "bg-blue-100 border border-blue-400 border-dashed" : "",
        ].filter(Boolean).join(" ");

        // Classes for the children container when receiving a new child
        const childrenContainerClasses = [
            "ml-4",
            // Highlight the children area when receiving a new child
            isReceivingChild ? "bg-blue-50 border-l-2 border-l-blue-300 pl-2" : "",
        ].filter(Boolean).join(" ");

        return (
            <div key={node.id}>
                <div
                    draggable
                    onDragStart={e => {
                        e.stopPropagation();
                        handleDragStart(node);
                    }}
                    onDrop={e => {
                        handleDrop(e, node);
                    }}
                    onDragOver={e => {
                        handleDragOver(e, node);
                    }}
                    onClick={e => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                    }}
                    onContextMenu={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
                    }}
                    className={nodeClasses}
                >
                    {hasChildren && (
                        <button
                            onClick={e => {
                                e.stopPropagation();
                                toggleCollapse(node.id);
                            }}
                            className="bg-transparent border-none cursor-pointer p-0 text-xs w-4 h-4 flex items-center justify-center"
                        >
                            {isCollapsed ? "▶" : "▼"}
                        </button>
                    )}
                    {!hasChildren && <span className="w-4"></span>}
                    <span>{node.name}</span>
                    {isReceivingChild && (
                        <span className="text-blue-600 text-xs ml-2 font-semibold">
                            ← Drop here to add as child
                        </span>
                    )}
                </div>
                {hasChildren && !isCollapsed && (
                    <div className={childrenContainerClasses}>
                        {node.children.map(child => renderNode(child))}
                        {isReceivingChild && (
                            <div className="text-blue-500 text-xs italic ml-4 py-1">
                                New child will appear here
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // --- Context menu UI ---
    const contextMenuUI = contextMenu ? (
        <div
            className="fixed bg-white border border-gray-300 rounded z-50 shadow-lg min-w-24"
            style={{
                top: contextMenu.y,
                left: contextMenu.x,
            }}
            onClick={e => e.stopPropagation()}
        >
            <div
                className="p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => {
                    handleAdd(contextMenu.nodeId);
                    setContextMenu(null);
                }}
            >
                Add Child
            </div>
            <div
                className="p-2 cursor-pointer hover:bg-gray-50"
                onClick={() => handleDuplicateNode(contextMenu.nodeId)}
            >
                Duplicate
            </div>
            <div
                className="p-2 cursor-pointer text-red-600 hover:bg-gray-50"
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
            <div className="absolute top-24 left-4 border-stone-700 border bg-stone-200/50 p-1">
                <div className="flex gap-2 items-center">
                    <h2>
                        Scene Hierarchy
                    </h2>
                    <button onClick={handleRawToggle}>⛭</button>
                    <div className="flex gap-1 ml-2">
                        <button
                            onClick={handleUndo}
                            disabled={!historyManager.current.canUndo()}
                            className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Undo (Cmd/Ctrl+Z)"
                        >
                            ↶
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={!historyManager.current.canRedo()}
                            className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Redo (Cmd/Ctrl+Y or Cmd/Ctrl+Shift+Z)"
                        >
                            ↷
                        </button>
                    </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
                    {rawMode ? (
                        <div className="flex flex-col gap-2">
                            <div>
                                <div className="font-bold">Models</div>
                                <div className="flex flex-col">
                                    {Object.keys(models).length === 0
                                        ? <div className="text-gray-500">No models loaded.</div>
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
                                <div className="font-bold">SceneGraph</div>
                                <div className="flex gap-2 mt-2 mb-2">
                                    <select
                                        className="px-2 py-1 border rounded bg-white"
                                        onChange={(e) => handleLoadPreset(e.target.value)}
                                        defaultValue=""
                                    >
                                        <option value="">Load Preset...</option>
                                        {Object.keys(presets).map(presetName => (
                                            <option key={presetName} value={presetName}>
                                                {presetName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        className="px-3 py-1 border rounded bg-white hover:bg-green-50 text-green-700"
                                        onClick={handleSaveJSON}
                                    >
                                        Save JSON
                                    </button>
                                    <button
                                        className="px-3 py-1 border rounded bg-white hover:bg-blue-50 text-blue-700"
                                        onClick={handleLoadJSON}
                                    >
                                        Load JSON
                                    </button>
                                    <button
                                        className="px-3 py-1 border rounded bg-white hover:bg-purple-50 text-purple-700"
                                        onClick={handleDownloadGLB}
                                    >
                                        Download GLB
                                    </button>
                                </div>
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
