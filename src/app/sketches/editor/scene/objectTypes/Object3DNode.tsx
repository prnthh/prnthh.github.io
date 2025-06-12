import React from "react";
import { ObjectNode } from "./Object3D";
import { SpotlightNode } from "./SpotLight";
import { OrthographicCameraNode } from "./OrthoCamera";
import type { Group, Object3DEventMap } from "three";
import type { SceneGraphNode } from "../page";

export function Object3DNode({ node, onSelect, selectedId, setTransformTarget }: { node: SceneGraphNode, onSelect: (node: SceneGraphNode) => void, selectedId?: string, setTransformTarget: (obj: Group<Object3DEventMap> | null) => void }) {
    if (node.type === "object") {
        return <ObjectNode node={node} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />;
    } else if (node.type === "spotlight") {
        return <SpotlightNode node={node} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />;
    } else if (node.type === "orthographicCamera") {
        return <OrthographicCameraNode node={node} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />;
    }
    return null;
}
