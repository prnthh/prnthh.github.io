// Utility functions for scene graph operations
import { ObjectTypes } from "./objectTypes";
import type { SceneGraphNode } from "./EditorContext";

export function findNodeById(node: SceneGraphNode, id: string): SceneGraphNode | null {
    if (node.id === id) return node;
    for (let c of node.children) {
        const found = findNodeById(c, id);
        if (found) return found;
    }
    return null;
}

export function updateNodeById(node: SceneGraphNode, id: string, updates: Partial<SceneGraphNode>): SceneGraphNode {
    if (node.id === id) {
        if (updates.props) {
            return { ...node, props: { ...node.props, ...updates.props } };
        }
        return { ...node, ...updates };
    }
    return { ...node, children: node.children.map(child => updateNodeById(child, id, updates)) };
}

export function removeNodeById(node: SceneGraphNode, id: string): SceneGraphNode {
    return {
        ...node,
        children: node.children
            .filter(c => c.id !== id)
            .map(c => removeNodeById(c, id)),
    };
}

export function addNodeToParent(node: SceneGraphNode, parentId: string, newNode: SceneGraphNode): SceneGraphNode {
    if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode] };
    }
    return { ...node, children: node.children.map(child => addNodeToParent(child, parentId, newNode)) };
}

export function stripDefaultsFromNode(node: SceneGraphNode): any {
    const typeDef = ObjectTypes[node.type as keyof typeof ObjectTypes];
    const result: any = {
        id: node.id,
        type: node.type,
        name: node.name,
        props: {},
        components: node.components && node.components.length > 0 ? node.components : undefined,
        children: node.children.map(stripDefaultsFromNode),
    };
    if (typeDef && typeDef.defaultProps) {
        for (const key in node.props) {
            if (
                JSON.stringify(node.props[key]) !==
                JSON.stringify((typeDef.defaultProps as Record<string, any>)[key])
            ) {
                result.props[key] = node.props[key];
            }
        }
    } else {
        result.props = { ...node.props };
    }
    if (Object.keys(result.props).length === 0) delete result.props;
    if (!result.components) delete result.components;
    return result;
}

export function applyDefaultsToNode(node: Omit<SceneGraphNode, "parent" | "children"> & { children: any[] }): SceneGraphNode {
    const typeDef = ObjectTypes[node.type as keyof typeof ObjectTypes];
    const props = typeDef && typeDef.defaultProps
        ? { ...typeDef.defaultProps, ...(node.props || {}) }
        : { ...(node.props || {}) };
    return {
        id: node.id,
        type: node.type,
        name: node.name,
        props,
        components: node.components || [],
        parent: null,
        children: (node.children || []).map(applyDefaultsToNode),
    };
}
