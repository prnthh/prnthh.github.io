"use client";

import DraggableDiv from "@/shared/ui/DraggableDiv";
import { useState, useRef, useEffect } from "react";
import { dialogLibrary, sampleActors } from "./defaultData";

export interface DialogNode {
    id: string;
    text?: string;
    choices?: { text: string; nextId: string }[];
    nextId?: string;
    position: [number, number];
    requiredFlags?: string[];
    requiredInventory?: string[];
    forbiddenFlags?: string[];
}

export interface Actor {
    id: string;
    name: string;
    dialogIds: string[]; // Ordered list of dialog IDs to check
}

interface GameState {
    flags: string[];
    inventory: string[];
}

// Helper function to check if requirements are met
const checkRequirements = (node: DialogNode, gameState: GameState): boolean => {
    // Check required flags
    if (node.requiredFlags) {
        if (!node.requiredFlags.every(flag => gameState.flags.includes(flag))) {
            return false;
        }
    }

    // Check required inventory
    if (node.requiredInventory) {
        if (!node.requiredInventory.every(item => gameState.inventory.includes(item))) {
            return false;
        }
    }

    // Check forbidden flags
    if (node.forbiddenFlags) {
        if (node.forbiddenFlags.some(flag => gameState.flags.includes(flag))) {
            return false;
        }
    }

    return true;
};

interface ActorNode {
    type: 'actor';
    id: string;
    name: string;
    position: [number, number];
}

export default function NarrativeGraphEditor() {
    const [actors] = useState<Actor[]>(sampleActors);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(actors[0]);
    const [gameState, setGameState] = useState<GameState>({
        flags: [],
        inventory: []
    });

    // Build unified graph with actor at center and all reachable dialogs
    const buildUnifiedGraph = (actor: Actor): { nodes: Map<string, DialogNode>; actorNode: ActorNode; startNodes: string[] } => {
        const allNodes = new Map<string, DialogNode>();

        // Traverse all reachable dialogs from all start points
        const traverse = (dialogId: string) => {
            if (allNodes.has(dialogId)) return;

            const dialog = dialogLibrary[dialogId];
            if (!dialog) return;

            allNodes.set(dialogId, dialog);

            if (dialog.choices) {
                dialog.choices.forEach(choice => traverse(choice.nextId));
            } else if (dialog.nextId) {
                traverse(dialog.nextId);
            }
        };

        // Traverse from each start dialog
        actor.dialogIds.forEach(dialogId => traverse(dialogId));

        // Auto-layout the nodes
        const layoutNodes = new Map<string, DialogNode>();
        const startY = 200;
        const horizontalSpacing = 350;
        const verticalSpacing = 200;

        // Position start nodes
        actor.dialogIds.forEach((dialogId, index) => {
            const node = allNodes.get(dialogId);
            if (node) {
                const x = 100 + (index * horizontalSpacing);
                layoutNodes.set(dialogId, { ...node, position: [x, startY] });
            }
        });

        // Position remaining nodes below
        let currentY = startY + verticalSpacing;
        let currentX = 100;
        let nodesInRow = 0;
        const maxNodesPerRow = 4;

        allNodes.forEach((node, id) => {
            if (!layoutNodes.has(id)) {
                layoutNodes.set(id, { ...node, position: [currentX, currentY] });
                currentX += horizontalSpacing;
                nodesInRow++;

                if (nodesInRow >= maxNodesPerRow) {
                    currentY += verticalSpacing;
                    currentX = 100;
                    nodesInRow = 0;
                }
            }
        });

        const actorNode: ActorNode = {
            type: 'actor',
            id: actor.id,
            name: actor.name,
            position: [100 + (actor.dialogIds.length - 1) * horizontalSpacing / 2, 50]
        };

        return { nodes: layoutNodes, actorNode, startNodes: actor.dialogIds };
    };

    return (
        <div className="w-screen h-screen flex flex-col text-black dark:text-white bg-gray-900">
            {/* Top toolbar */}
            <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
                <span className="font-bold">Actor:</span>
                <select
                    className="bg-gray-700 px-3 py-1 rounded"
                    value={selectedActor?.id || ""}
                    onChange={(e) => {
                        const actor = actors.find(a => a.id === e.target.value);
                        setSelectedActor(actor || null);
                    }}
                >
                    {actors.map(actor => (
                        <option key={actor.id} value={actor.id}>{actor.name}</option>
                    ))}
                </select>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Unified graph canvas */}
                <div className="flex-1 relative bg-gray-900 overflow-auto">
                    {selectedActor && (() => {
                        const { nodes, actorNode, startNodes } = buildUnifiedGraph(selectedActor);

                        return (
                            <div style={{ width: '3000px', height: '3000px', position: 'relative' }}>
                                <UnifiedConnectionLines
                                    actorNode={actorNode}
                                    startNodes={startNodes}
                                    dialogNodes={nodes}
                                />

                                {/* Actor node */}
                                <DraggableDiv position={actorNode.position}>
                                    <ActorNodeComponent actor={selectedActor} gameState={gameState} />
                                </DraggableDiv>

                                {/* All dialog nodes */}
                                {Array.from(nodes.values()).map(node => (
                                    <DraggableDiv key={node.id} position={node.position}>
                                        <DialogNodeComponent node={node} />
                                    </DraggableDiv>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                {/* Game State Panel */}
                <div className="w-64 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
                    <div className="font-bold mb-4">Game State</div>

                    <div className="mb-4">
                        <div className="text-sm text-gray-400 mb-2">Flags:</div>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {gameState.flags.map(flag => (
                                <span
                                    key={flag}
                                    className="bg-purple-600 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-purple-700"
                                    onClick={() => setGameState(prev => ({
                                        ...prev,
                                        flags: prev.flags.filter(f => f !== flag)
                                    }))}
                                >
                                    {flag} ×
                                </span>
                            ))}
                        </div>
                        <input
                            className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                            placeholder="Add flag (press Enter)"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value) {
                                    const value = e.currentTarget.value;
                                    setGameState(prev => ({
                                        ...prev,
                                        flags: [...prev.flags, value]
                                    }));
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                    </div>

                    <div>
                        <div className="text-sm text-gray-400 mb-2">Inventory:</div>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {gameState.inventory.map(item => (
                                <span
                                    key={item}
                                    className="bg-green-600 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-green-700"
                                    onClick={() => setGameState(prev => ({
                                        ...prev,
                                        inventory: prev.inventory.filter(i => i !== item)
                                    }))}
                                >
                                    {item} ×
                                </span>
                            ))}
                        </div>
                        <input
                            className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                            placeholder="Add item (press Enter)"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value) {
                                    const value = e.currentTarget.value;
                                    setGameState(prev => ({
                                        ...prev,
                                        inventory: [...prev.inventory, value]
                                    }));
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

const UnifiedConnectionLines = ({
    actorNode,
    startNodes,
    dialogNodes
}: {
    actorNode: ActorNode;
    startNodes: string[];
    dialogNodes: Map<string, DialogNode>;
}) => {
    const [lines, setLines] = useState<Array<{
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        label?: string;
        type: 'actor-to-start' | 'dialog-to-dialog';
    }>>([]);

    useEffect(() => {
        const updateLines = () => {
            const newLines: typeof lines = [];

            // Lines from actor to start nodes
            const actorEl = document.querySelector(`[data-node-id="${actorNode.id}"]`);
            if (actorEl) {
                const actorRect = actorEl.getBoundingClientRect();
                const actorCenterX = actorRect.left + actorRect.width / 2;
                const actorCenterY = actorRect.bottom - 10; // Adjust to start from bottom of node

                startNodes.forEach((dialogId, index) => {
                    const startEl = document.querySelector(`[data-node-id="${dialogId}"]`);
                    if (startEl) {
                        const startRect = startEl.getBoundingClientRect();
                        const startCenterX = startRect.left + startRect.width / 2;
                        const startCenterY = startRect.top;

                        newLines.push({
                            x1: actorCenterX,
                            y1: actorCenterY,
                            x2: startCenterX,
                            y2: startCenterY,
                            label: `#${index + 1}`,
                            type: 'actor-to-start'
                        });
                    }
                });
            }

            // Lines between dialog nodes
            dialogNodes.forEach(node => {
                const sourceEl = document.querySelector(`[data-node-id="${node.id}"]`);
                if (!sourceEl) return;

                const sourceRect = sourceEl.getBoundingClientRect();
                const sourceCenterX = sourceRect.left + sourceRect.width / 2;
                const sourceCenterY = sourceRect.top + sourceRect.height / 2;

                if (node.choices) {
                    node.choices.forEach(choice => {
                        const targetEl = document.querySelector(`[data-node-id="${choice.nextId}"]`);
                        if (targetEl) {
                            const targetRect = targetEl.getBoundingClientRect();
                            const targetCenterX = targetRect.left + targetRect.width / 2;
                            const targetCenterY = targetRect.top + targetRect.height / 2;

                            newLines.push({
                                x1: sourceCenterX,
                                y1: sourceCenterY,
                                x2: targetCenterX,
                                y2: targetCenterY,
                                label: choice.text,
                                type: 'dialog-to-dialog'
                            });
                        }
                    });
                } else if (node.nextId) {
                    const targetEl = document.querySelector(`[data-node-id="${node.nextId}"]`);
                    if (targetEl) {
                        const targetRect = targetEl.getBoundingClientRect();
                        const targetCenterX = targetRect.left + targetRect.width / 2;
                        const targetCenterY = targetRect.top + targetRect.height / 2;

                        newLines.push({
                            x1: sourceCenterX,
                            y1: sourceCenterY,
                            x2: targetCenterX,
                            y2: targetCenterY,
                            type: 'dialog-to-dialog'
                        });
                    }
                }
            });

            setLines(newLines);
        };

        updateLines();
        const interval = setInterval(updateLines, 100);
        return () => clearInterval(interval);
    }, [actorNode, startNodes, dialogNodes]);

    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {lines.map((line, i) => {
                const midX = (line.x1 + line.x2) / 2;
                const midY = (line.y1 + line.y2) / 2;
                const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180 / Math.PI;
                const color = line.type === 'actor-to-start' ? '#fbbf24' : '#4ade80'; // yellow for actor, green for dialogs

                return (
                    <g key={i}>
                        <line
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke={color}
                            strokeWidth="2"
                            markerEnd={`url(#arrowhead-${line.type})`}
                        />
                        {line.label && (
                            <text
                                x={midX}
                                y={midY}
                                fill={color}
                                fontSize="12"
                                textAnchor="middle"
                                transform={`rotate(${angle}, ${midX}, ${midY})`}
                                className="pointer-events-none select-none"
                            >
                                {line.label}
                            </text>
                        )}
                    </g>
                );
            })}
            <defs>
                <marker
                    id="arrowhead-actor-to-start"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3, 0 6" fill="#fbbf24" />
                </marker>
                <marker
                    id="arrowhead-dialog-to-dialog"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3, 0 6" fill="#4ade80" />
                </marker>
            </defs>
        </svg>
    );
};

const ActorNodeComponent = ({ actor, gameState }: { actor: Actor; gameState: GameState }) => {
    // Find which start dialog would be selected
    let matchedIndex = -1;
    for (let i = 0; i < actor.dialogIds.length; i++) {
        const node = dialogLibrary[actor.dialogIds[i]];
        if (node && checkRequirements(node, gameState)) {
            matchedIndex = i;
            break;
        }
    }

    return (
        <div
            data-node-id={actor.id}
            className="bg-blue-900 border-4 border-blue-500 p-4 rounded-lg shadow-2xl flex flex-col items-center"
            style={{ zIndex: 1 }}
        >
            <div className="text-2xl font-bold mb-2">🎭 {actor.name}</div>
            <div className="text-sm text-gray-300 mb-2">Actor</div>
            {matchedIndex >= 0 && (
                <div className="text-xs bg-green-600 px-2 py-1 rounded">
                    Matches: #{matchedIndex + 1}
                </div>
            )}
        </div>
    );
};

const DialogNodeComponent = ({ node, allNodes }: { node: DialogNode; allNodes?: DialogNode[] }) => {
    const hasRequirements = node.requiredFlags?.length || node.requiredInventory?.length || node.forbiddenFlags?.length;

    return (
        <div
            data-node-id={node.id}
            className={`bg-slate-800 p-3 rounded-lg shadow-lg flex flex-col w-64 border-2 ${hasRequirements ? 'border-yellow-500' : 'border-slate-600'
                }`}
            style={{ zIndex: 1 }}
        >
            <div className="text-xs font-mono text-gray-400 mb-2">{node.id}</div>

            {hasRequirements && (
                <div className="mb-2 text-xs">
                    {node.requiredFlags && node.requiredFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                            {node.requiredFlags.map(flag => (
                                <span key={flag} className="bg-purple-600 px-1.5 py-0.5 rounded">
                                    🚩 {flag}
                                </span>
                            ))}
                        </div>
                    )}
                    {node.requiredInventory && node.requiredInventory.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                            {node.requiredInventory.map(item => (
                                <span key={item} className="bg-green-600 px-1.5 py-0.5 rounded">
                                    📦 {item}
                                </span>
                            ))}
                        </div>
                    )}
                    {node.forbiddenFlags && node.forbiddenFlags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {node.forbiddenFlags.map(flag => (
                                <span key={flag} className="bg-red-600 px-1.5 py-0.5 rounded">
                                    ⛔ {flag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <textarea
                className="w-full mb-2 bg-slate-700 text-white p-2 rounded resize-none"
                rows={3}
                defaultValue={node.text}
            />

            {node.choices && node.choices.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="text-xs text-gray-400">Choices:</div>
                    {node.choices.map((choice, index) => (
                        <div key={index} className="flex gap-2 items-center text-sm">
                            <input
                                className="flex-1 bg-slate-700 text-white px-2 py-1 rounded text-xs"
                                defaultValue={choice.text}
                            />
                            <span className="text-gray-400">→</span>
                            <span className="text-green-400 text-xs">{choice.nextId}</span>
                        </div>
                    ))}
                </div>
            )}

            {node.nextId && (
                <div className="flex gap-2 items-center text-sm mt-2">
                    <span className="text-gray-400">Next:</span>
                    <span className="text-green-400">{node.nextId}</span>
                </div>
            )}
        </div>
    );
};
