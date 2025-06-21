import React from "react";
import { BaseNode } from "./Node";
import type { Group, Object3DEventMap } from "three";
import type { SceneGraphNode } from "../page";

// Unified node renderer: delegates to BaseNode for all types
export function Object3DNode({ node, onSelect, selectedId, setTransformTarget, isPlaying }: { node: SceneGraphNode, onSelect: (node: SceneGraphNode) => void, selectedId?: string, setTransformTarget: (obj: Group<Object3DEventMap> | null) => void, isPlaying?: boolean }) {
    return (
        <BaseNode
            node={node}
            onSelect={onSelect}
            selectedId={selectedId}
            setTransformTarget={setTransformTarget}
            isPlaying={isPlaying}
        />
    );
}
