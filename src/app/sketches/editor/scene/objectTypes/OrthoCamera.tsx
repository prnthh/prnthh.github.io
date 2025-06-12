import React from "react";
import { Group, Object3DEventMap } from "three";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentDefault } from "../components/RigidBodyComponent";
import { Object3DNode } from "./Object3DNode";

export const OrthoCameraType = {
  type: "orthographicCamera",
  displayName: "OrthoCamera",
  defaultProps: {
    name: "OrthoCamera",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    left: -2,
    right: 2,
    top: 2,
    bottom: -2,
    near: 0.1,
    far: 100,
  },
  propSchema: [
    { key: "name", type: "string" },
    { key: "position", type: "vec3" },
    { key: "rotation", type: "vec3" },
    { key: "scale", type: "vec3" },
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
    if (field === "name") {
      onUpdate({ name: value });
    } else {
      onUpdate({ props: { ...node.props, [field]: value } });
    }
  };
  const handleVec3Change = (field: string, idx: number, value: number) => {
    const arr = [...(node.props[field] as number[])];
    arr[idx] = value;
    onUpdate({ props: { ...node.props, [field]: arr } });
  };
  return (
    <div>
      <div>
        Name: <input value={node.name} onChange={e => handleChange('name', e.target.value)} style={{ fontFamily: 'monospace', width: 100 }} />
      </div>
      <div>
        Position:
        {[0, 1, 2].map(i => (
          <input
            key={i}
            type="number"
            value={node.props.position[i]}
            step="0.1"
            style={{ width: 50, marginLeft: 4 }}
            onChange={e => handleVec3Change('position', i, parseFloat(e.target.value))}
          />
        ))}
      </div>
      <div>
        Rotation:
        {[0, 1, 2].map(i => (
          <input
            key={i}
            type="number"
            value={node.props.rotation[i]}
            step="0.1"
            style={{ width: 50, marginLeft: 4 }}
            onChange={e => handleVec3Change('rotation', i, parseFloat(e.target.value))}
          />
        ))}
      </div>
      <div>
        Scale:
        {[0, 1, 2].map(i => (
          <input
            key={i}
            type="number"
            value={node.props.scale[i]}
            step="0.1"
            style={{ width: 50, marginLeft: 4 }}
            onChange={e => handleVec3Change('scale', i, parseFloat(e.target.value))}
          />
        ))}
      </div>
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

export function OrthographicCameraNode({ node, onSelect, selectedId, setTransformTarget }: { node: any, onSelect: (node: any) => void, selectedId?: string, setTransformTarget: (obj: Group<Object3DEventMap> | null) => void }) {
  const groupRef = selectedId === node.id
    ? (instance: Group<Object3DEventMap> | null) => setTransformTarget(instance)
    : undefined;
  const rigidBodyComp = node.components?.find((c: any) => c.type === "RigidBody");
  const group = (
    <group ref={groupRef} name={node.name}>
      {node.children.map((child: any) => (
        <Object3DNode key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} />
      ))}
    </group>
  );
  if (rigidBodyComp) {
    return (
      <RigidBody type={rigidBodyComp.data?.type || RigidBodyComponentDefault.type} position={node.props.position} rotation={node.props.rotation} scale={node.props.scale}>
        {group}
      </RigidBody>
    );
  } else {
    return React.cloneElement(group, {
      position: node.props.position,
      rotation: node.props.rotation,
      scale: node.props.scale,
    });
  }
}
