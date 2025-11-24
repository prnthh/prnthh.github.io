import { Dispatch, SetStateAction, useState, MouseEvent } from 'react';
import { Prefab, GameObject, COMPONENT_DEFS } from "./types";

interface EditorTreeProps {
    prefabData?: Prefab;
    setPrefabData?: Dispatch<SetStateAction<Prefab>>;
    selectedId: string | null;
    setSelectedId: Dispatch<SetStateAction<string | null>>;
}

export default function EditorTree({ prefabData, setPrefabData, selectedId, setSelectedId }: EditorTreeProps) {
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

    if (!prefabData || !setPrefabData) return null;

    const handleContextMenu = (e: MouseEvent, nodeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    };

    const closeContextMenu = () => setContextMenu(null);

    const toggleCollapse = (e: MouseEvent, id: string) => {
        e.stopPropagation();
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Actions
    const handleAddChild = (parentId: string) => {
        const newNode: GameObject = {
            id: crypto.randomUUID(),
            enabled: true,
            visible: true,
            components: {
                transform: {
                    type: "Transform",
                    properties: { ...COMPONENT_DEFS.transform.defaultProps }
                }
            }
        };

        setPrefabData(prev => {
            const newRoot = JSON.parse(JSON.stringify(prev.root)); // Deep clone for safety
            const parent = findNode(newRoot, parentId);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(newNode);
            }
            return { ...prev, root: newRoot };
        });
        closeContextMenu();
    };

    const handleDuplicate = (nodeId: string) => {
        if (nodeId === prefabData.root.id) return; // Cannot duplicate root

        setPrefabData(prev => {
            const newRoot = JSON.parse(JSON.stringify(prev.root));
            const parent = findParent(newRoot, nodeId);
            const node = findNode(newRoot, nodeId);

            if (parent && node) {
                const clone = cloneNode(node);
                parent.children = parent.children || [];
                parent.children.push(clone);
            }
            return { ...prev, root: newRoot };
        });
        closeContextMenu();
    };

    const handleDelete = (nodeId: string) => {
        if (nodeId === prefabData.root.id) return; // Cannot delete root

        setPrefabData(prev => {
            const newRoot = deleteNodeFromTree(JSON.parse(JSON.stringify(prev.root)), nodeId);
            return { ...prev, root: newRoot! };
        });
        if (selectedId === nodeId) setSelectedId(null);
        closeContextMenu();
    };

    // Drag and Drop
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.stopPropagation();
        if (id === prefabData.root.id) {
            e.preventDefault(); // Cannot drag root
            return;
        }
        setDraggedId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedId || draggedId === targetId) return;

        // Check for cycles: target cannot be a descendant of dragged node
        const draggedNode = findNode(prefabData.root, draggedId);
        if (draggedNode && findNode(draggedNode, targetId)) return;

        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedId || draggedId === targetId) return;

        setPrefabData(prev => {
            const newRoot = JSON.parse(JSON.stringify(prev.root));

            // Check cycle again on the fresh tree
            const draggedNodeRef = findNode(newRoot, draggedId);
            if (draggedNodeRef && findNode(draggedNodeRef, targetId)) return prev;

            // Remove from old parent
            const parent = findParent(newRoot, draggedId);
            if (!parent) return prev;

            const nodeToMove = parent.children?.find(c => c.id === draggedId);
            if (!nodeToMove) return prev;

            parent.children = parent.children!.filter(c => c.id !== draggedId);

            // Add to new parent
            const target = findNode(newRoot, targetId);
            if (target) {
                target.children = target.children || [];
                target.children.push(nodeToMove);
            }

            return { ...prev, root: newRoot };
        });
        setDraggedId(null);
    };

    const renderNode = (node: GameObject, depth: number = 0) => {
        const isSelected = node.id === selectedId;
        const isCollapsed = collapsedIds.has(node.id);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <div key={node.id} className="select-none">
                <div
                    className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-700 ${isSelected ? 'bg-blue-600 hover:bg-blue-500' : ''}`}
                    style={{ paddingLeft: `${depth * 12 + 4}px` }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                    onContextMenu={(e) => handleContextMenu(e, node.id)}
                    draggable={node.id !== prefabData.root.id}
                    onDragStart={(e) => handleDragStart(e, node.id)}
                    onDragOver={(e) => handleDragOver(e, node.id)}
                    onDrop={(e) => handleDrop(e, node.id)}
                >
                    <span
                        className={`mr-1 w-4 text-center text-gray-400 hover:text-white cursor-pointer ${hasChildren ? '' : 'invisible'}`}
                        onClick={(e) => hasChildren && toggleCollapse(e, node.id)}
                    >
                        {isCollapsed ? '▶' : '▼'}
                    </span>
                    <span className="text-sm truncate">
                        {node.id}
                        {/* <span className="text-gray-400 text-xs ml-2">
                            {Object.keys(node.components || {}).join(', ')}
                        </span> */}
                    </span>
                </div>
                {!isCollapsed && node.children && (
                    <div>
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-gray-800 text-white rounded shadow-lg w-64 max-h-[80vh] overflow-y-auto flex flex-col" onClick={closeContextMenu}>
            <div className="p-2 font-bold bg-gray-900 border-b border-gray-700 sticky top-0">
                Prefab Graph
            </div>
            <div className="flex-1 py-2">
                {renderNode(prefabData.root)}
            </div>

            {contextMenu && (
                <div
                    className="fixed bg-gray-700 border border-gray-600 shadow-xl rounded py-1 z-50 min-w-[120px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-600 text-sm"
                        onClick={() => handleAddChild(contextMenu.nodeId)}
                    >
                        Add Child
                    </button>
                    {contextMenu.nodeId !== prefabData.root.id && (
                        <>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-600 text-sm"
                                onClick={() => handleDuplicate(contextMenu.nodeId)}
                            >
                                Duplicate
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-600 text-sm text-red-400"
                                onClick={() => handleDelete(contextMenu.nodeId)}
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Helpers ---

function findNode(root: GameObject, id: string): GameObject | null {
    if (root.id === id) return root;
    if (root.children) {
        for (const child of root.children) {
            const found = findNode(child, id);
            if (found) return found;
        }
    }
    return null;
}

function findParent(root: GameObject, id: string): GameObject | null {
    if (!root.children) return null;
    for (const child of root.children) {
        if (child.id === id) return root;
        const found = findParent(child, id);
        if (found) return found;
    }
    return null;
}

function deleteNodeFromTree(root: GameObject, id: string): GameObject | null {
    if (root.id === id) return null;
    if (root.children) {
        root.children = root.children
            .map(child => deleteNodeFromTree(child, id))
            .filter((child): child is GameObject => child !== null);
    }
    return root;
}

function cloneNode(node: GameObject): GameObject {
    const newNode = { ...node, id: crypto.randomUUID() };
    if (newNode.children) {
        newNode.children = newNode.children.map(child => cloneNode(child));
    }
    return newNode;
}
