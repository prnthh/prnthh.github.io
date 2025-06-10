import React from "react";

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
