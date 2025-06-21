import React from "react";
import { Group, Object3DEventMap } from "three";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentDefault } from "../components/RigidBodyComponent";
import { Object3DNode } from "./Object3DNode";
import { DetailsView as NodeDetailsView, BaseNode, getNodeMesh } from "./Node";
import { NodeType } from "./nodeTypes";

export const OrthoCameraType = {
  ...NodeType,
  type: "orthographicCamera",
  displayName: "OrthoCamera",
  defaultProps: {
    ...NodeType.defaultProps,
    name: "OrthoCamera",
    left: -2,
    right: 2,
    top: 2,
    bottom: -2,
    near: 0.1,
    far: 100,
  },
  propSchema: [
    ...NodeType.propSchema,
    { key: "left", type: "number" },
    { key: "right", type: "number" },
    { key: "top", type: "number" },
    { key: "bottom", type: "number" },
    { key: "near", type: "number" },
    { key: "far", type: "number" },
  ],
};

export function DetailsView({ node, onUpdate }: { node: any; onUpdate: (updates: any) => void }) {
  const handleChange = (field: string, value: any) => {
    onUpdate(field === "name" ? { name: value } : { props: { ...node.props, [field]: value } });
  };
  const handleVec3Change = (field: string, idx: number, value: number) => {
    const arr = [...(node.props[field] as number[])];
    arr[idx] = value;
    onUpdate({ props: { ...node.props, [field]: arr } });
  };
  return (
    <div>
      <NodeDetailsView node={node} onUpdate={onUpdate} />
      <div>
        Left: <input type="number" value={node.props.left} step="0.1" onChange={e => handleChange('left', parseFloat(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
        Right: <input type="number" value={node.props.right} step="0.1" onChange={e => handleChange('right', parseFloat(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
        Top: <input type="number" value={node.props.top} step="0.1" onChange={e => handleChange('top', parseFloat(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
        Bottom: <input type="number" value={node.props.bottom} step="0.1" onChange={e => handleChange('bottom', parseFloat(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
        Near: <input type="number" value={node.props.near} step="0.1" onChange={e => handleChange('near', parseFloat(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
        Far: <input type="number" value={node.props.far} step="0.1" onChange={e => handleChange('far', parseFloat(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
      </div>
    </div>
  );
}
