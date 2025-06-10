import React from "react";

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
