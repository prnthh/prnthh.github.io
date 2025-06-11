import React, { ReactElement } from "react";
import { ObjectNode } from "./Object3D";
import { SpotlightNode } from "./SpotLight";
import { OrthographicCameraNode } from "./OrthoCamera";
import type { Group, Object3DEventMap } from "three";
import type { SceneGraphNode } from "../page";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentDefault } from "../components/RigidBodyComponent";

function applyComponents(node: SceneGraphNode, jsx: ReactElement) {
    // Wraps the jsx with all components in node.components, starting with RigidBody
    let wrapped = jsx;
    if (node.components) {
        for (const comp of node.components) {
            if (comp.type === "RigidBody") {
                wrapped = (
                    <RigidBody
                        type={comp.data?.type || RigidBodyComponentDefault.type}
                        position={node.props.position}
                        rotation={node.props.rotation}
                        scale={node.props.scale}
                    >
                        {wrapped}
                    </RigidBody>
                );
            }
            // Future: add more component wrappers here, e.g. CircularMoveComponent
        }
    }
    // Always apply transform props if not handled by a component
    if (!node.components?.some((c: { type: string }) => c.type === "RigidBody")) {
        wrapped = React.cloneElement(
            wrapped as React.ReactElement<any>,
            {
                position: node.props.position,
                rotation: node.props.rotation,
                scale: node.props.scale,
            }
        );
    }
    return wrapped;
}

export function Object3DNode({ node, onSelect, selectedId, setTransformTarget }: { node: SceneGraphNode, onSelect: (node: SceneGraphNode) => void, selectedId?: string, setTransformTarget: (obj: Group<Object3DEventMap> | null) => void }) {
    let jsx = null;
    if (node.type === "object") {
        jsx = <ObjectNode node={node} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />;
    } else if (node.type === "spotlight") {
        jsx = <SpotlightNode node={node} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />;
    } else if (node.type === "orthographicCamera") {
        jsx = <OrthographicCameraNode node={node} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />;
    }
    if (!jsx) return null;
    return applyComponents(node, jsx);
}
