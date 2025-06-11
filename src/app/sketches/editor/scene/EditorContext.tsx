// EditorContext.tsx
import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { ObjectTypes } from "./objectTypes";
import type { Group, Object3DEventMap } from "three";
import {
    findNodeById,
    updateNodeById,
    removeNodeById,
    addNodeToParent,
    stripDefaultsFromNode,
    applyDefaultsToNode,
} from "./sceneGraphUtils";

// Types for scene graph
export type SceneGraphNode = {
    id: string;
    name: string;
    type: "object" | "spotlight" | "orthographicCamera";
    children: SceneGraphNode[];
    parent: SceneGraphNode | null;
    props: Record<string, any>;
    components?: Array<{
        type: string;
        data?: any;
    }>;
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
        components: [],
    };
}

// Context
export type EditorContextType = {
    root: SceneGraphNode;
    setRoot: React.Dispatch<React.SetStateAction<SceneGraphNode>>;
    selected: SceneGraphNode | null;
    setSelected: (node: SceneGraphNode | null) => void;
    transformTarget: Group<Object3DEventMap> | null;
    setTransformTarget: (obj: Group<Object3DEventMap> | null) => void;
    handleAdd: (parent: SceneGraphNode, type?: "object" | "spotlight" | "orthographicCamera") => void;
    handleDragStart: (node: SceneGraphNode) => void;
    handleDrop: (targetNode: SceneGraphNode) => void;
    handleUpdateSelected: (updates: Partial<SceneGraphNode>) => void;
    // --- Removed utility functions ---
    // findNodeById: typeof findNodeById;
    // updateNodeById: typeof updateNodeById;
    // removeNodeById: typeof removeNodeById;
    // addNodeToParent: typeof addNodeToParent;
    // stripDefaultsFromNode: typeof stripDefaultsFromNode;
    // applyDefaultsToNode: typeof applyDefaultsToNode;
    // --- Added for scene settings and text ---
    sceneSettings: { physics: boolean };
    setSceneSettings: React.Dispatch<React.SetStateAction<{ physics: boolean }>>;
    showSceneDetails: boolean;
    setShowSceneDetails: React.Dispatch<React.SetStateAction<boolean>>;
    sceneText: string;
    setSceneText: React.Dispatch<React.SetStateAction<string>>;
    handleSceneTextBlur: () => void;
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function useEditorContext() {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditorContext must be used within EditorProvider");
    return ctx;
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
    const [root, setRoot] = useState<SceneGraphNode>(() => createNode("object", "Root"));
    const [selected, setSelected] = useState<SceneGraphNode | null>(null);
    const dragNode = useRef<SceneGraphNode | null>(null);
    const [transformTarget, setTransformTarget] = useState<Group<Object3DEventMap> | null>(null);
    // --- Scene settings and text state ---
    const [sceneSettings, setSceneSettings] = useState<{ physics: boolean }>({ physics: true });
    const [showSceneDetails, setShowSceneDetails] = useState(false);
    const [sceneText, setSceneText] = useState<string>("");

    // --- Scene text blur handler ---
    const handleSceneTextBlur = () => {
        try {
            const parsed = JSON.parse(sceneText);
            if (
                parsed && typeof parsed === 'object' &&
                parsed.settings && typeof parsed.settings === 'object' &&
                parsed.graph && typeof parsed.graph === 'object' &&
                parsed.graph.id && parsed.graph.type && Array.isArray(parsed.graph.children)
            ) {
                setSceneSettings(parsed.settings);
                setRoot(applyDefaultsToNode(parsed.graph));
                setSelected(null);
            }
        } catch (e) {
            // ignore parse errors
        }
    };

    // --- Sync sceneText with root/settings when showing scene details ---
    useEffect(() => {
        if (!showSceneDetails) return;
        setSceneText(
            JSON.stringify(
                { settings: sceneSettings, graph: stripDefaultsFromNode(root) },
                null,
                2
            )
        );
    }, [root, sceneSettings, showSceneDetails]);

    useEffect(() => {
        setTransformTarget(null);
    }, [selected?.id]);

    // --- Add node handler ---
    const handleAdd = (parent: SceneGraphNode, type: "object" | "spotlight" | "orthographicCamera" = "object") => {
        const newNode = createNode(type);
        setRoot(prev => addNodeToParent(prev, parent.id, newNode));
    };

    // --- Drag and drop handlers ---
    const handleDragStart = (node: SceneGraphNode) => {
        dragNode.current = node;
    };
    const handleDrop = (targetNode: SceneGraphNode) => {
        if (!dragNode.current || dragNode.current.id === targetNode.id) return;
        // Remove from old parent
        let updated = removeNodeById(root, dragNode.current.id);
        // Add to new parent
        updated = addNodeToParent(updated, targetNode.id, dragNode.current);
        setRoot(updated);
        dragNode.current = null;
    };

    // --- Update selected node handler ---
    const handleUpdateSelected = (updates: Partial<SceneGraphNode>) => {
        if (!selected) return;
        setRoot(prev => updateNodeById(prev, selected.id, updates));
        setSelected(sel => sel ? { ...sel, ...updates, props: { ...sel.props, ...(updates.props || {}) } } : sel);
    };

    return (
        <EditorContext.Provider value={{
            root,
            setRoot,
            selected,
            setSelected,
            transformTarget,
            setTransformTarget,
            handleAdd,
            handleDragStart,
            handleDrop,
            handleUpdateSelected,
            // --- Removed ---
            // findNodeById,
            // updateNodeById,
            // removeNodeById,
            // addNodeToParent,
            // stripDefaultsFromNode,
            // applyDefaultsToNode,
            // --- Added ---
            sceneSettings,
            setSceneSettings,
            showSceneDetails,
            setShowSceneDetails,
            sceneText,
            setSceneText,
            handleSceneTextBlur,
        }}>
            {children}
        </EditorContext.Provider>
    );
}
