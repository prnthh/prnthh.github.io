import React from "react";
import { Group, Object3DEventMap } from "three";
import { RigidBody } from "@react-three/rapier";
import { RigidBodyComponentDefault } from "../components/RigidBodyComponent";
import { Object3DNode } from "./Object3DNode";

export const SpotLightType = {
  type: "spotlight",
  displayName: "SpotLight",
  defaultProps: {
    name: "SpotLight",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: "#ffffff",
    intensity: 1,
  },
  propSchema: [
    { key: "name", type: "string" },
    { key: "position", type: "vec3" },
    { key: "rotation", type: "vec3" },
    { key: "scale", type: "vec3" },
    { key: "color", type: "color" },
    { key: "intensity", type: "number" },
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
        Color: <input type="color" value={node.props.color || "#ffffff"} onChange={e => handleChange('color', e.target.value)} style={{ width: 40, height: 24, verticalAlign: 'middle' }} />
        <input type="text" value={node.props.color || "#ffffff"} onChange={e => handleChange('color', e.target.value)} style={{ width: 80, marginLeft: 4 }} />
      </div>
      <div>
        Intensity: <input type="number" value={node.props.intensity || 1} step="0.1" onChange={e => handleChange('intensity', parseFloat(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
      </div>
    </div>
  );
}

export function SpotlightNode({ node, onSelect, selectedId, setTransformTarget }: { node: any, onSelect: (node: any) => void, selectedId?: string, setTransformTarget: (obj: Group<Object3DEventMap> | null) => void }) {
  const groupRef = selectedId === node.id
    ? (instance: Group<Object3DEventMap> | null) => setTransformTarget(instance)
    : undefined;
  const rigidBodyComp = node.components?.find((c: any) => c.type === "RigidBody");
  const group = (
    <group ref={groupRef} name={node.name}>
      <spotLight
        color={node.props.color || "#ffffff"}
        intensity={node.props.intensity || 1}
        position={[0, 0, 0]}
      />
      <mesh onClick={e => { e.stopPropagation(); onSelect(node); }}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={node.props.color || "#ffffff"} />
      </mesh>
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
