import React from "react";
import { Group, Object3DEventMap } from "three";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentDefault } from "../components/RigidBodyComponent";
import { Object3DNode } from "./Object3DNode";
import { DetailsView as NodeDetailsView, BaseNode, getNodeMesh } from "./Node";
import { NodeType } from "./nodeTypes";

export const SpotLightType = {
  ...NodeType,
  type: "spotlight",
  displayName: "SpotLight",
  defaultProps: {
    ...NodeType.defaultProps,
    name: "SpotLight",
    color: "#ffffff",
    intensity: 1,
  },
  propSchema: [
    ...NodeType.propSchema,
    { key: "color", type: "color" },
    { key: "intensity", type: "number" },
  ],
};

export function DetailsView({ node, onUpdate }: { node: any; onUpdate: (updates: any) => void }) {
  // Reuse Node's DetailsView for base fields
  const handleChange = (field: string, value: any) => {
    onUpdate({ props: { ...node.props, [field]: value } });
  };
  return (
    <div>
      <NodeDetailsView node={node} onUpdate={onUpdate} />
      <div>
        Color: <input type="color" value={node.props.color || "#ffffff"} onChange={e => handleChange('color', e.target.value)} style={{ width: 40, height: 24, verticalAlign: 'middle' }} />
        <input type="text" value={node.props.color || "#ffffff"} onChange={e => handleChange('color', e.target.value)} style={{ width: 80, marginLeft: 4 }} />
      </div>
      <div>
        Intensity: <input type="number" value={node.props.intensity || 1} step="0.1" onChange={e => handleChange('intensity', parseFloat(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
      </div>
    </div>
  );
}

// REMOVE SpotlightNode: all rendering is now handled by BaseNode via Object3DNode
