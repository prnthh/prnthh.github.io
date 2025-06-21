import React from "react";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentDefault } from "../components/RigidBodyComponent";
import { DetailsView as NodeDetailsView, BaseNode, getNodeMesh } from "./Node";
import { NodeType } from "./nodeTypes";

import { Object3DNode } from "./Object3DNode";

export const Object3DType = {
  ...NodeType,
  type: "object",
  displayName: "Object3D",
  defaultProps: {
    ...NodeType.defaultProps,
    name: "Object3D",
    material: "#4f8cff",
  },
  propSchema: [
    ...NodeType.propSchema,
    { key: "material", type: "color" },
  ],
};

export function DetailsView({ node, onUpdate }: { node: any; onUpdate: (updates: any) => void }) {
  // Reuse Node's DetailsView for base fields
  return (
    <div>
      <NodeDetailsView node={node} onUpdate={onUpdate} />
      <div>
        Material: <input type="color" value={node.props.material || "#4f8cff"} onChange={e => onUpdate({ props: { ...node.props, material: e.target.value } })} style={{ width: 40, height: 24, verticalAlign: 'middle' }} />
        <input type="text" value={node.props.material || "#4f8cff"} onChange={e => onUpdate({ props: { ...node.props, material: e.target.value } })} style={{ width: 80, marginLeft: 4 }} />
      </div>
    </div>
  );
}

// REMOVE ObjectNode: all rendering is now handled by BaseNode via Object3DNode
