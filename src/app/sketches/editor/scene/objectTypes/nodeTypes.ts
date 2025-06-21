
export const NodeType = {
    type: "node",
    displayName: "Node",
    defaultProps: {
        name: "Node",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    },
    propSchema: [
        { key: "name", type: "string" },
        { key: "position", type: "vec3" },
        { key: "rotation", type: "vec3" },
        { key: "scale", type: "vec3" },
    ],
};