import React from "react";
import NumberInput from "../ui/NumberInput";
import { SceneNode } from "../../viewer/SceneViewer";

// --- Utility to update a node and a component by index ---
export function updateSceneGraphNodeAndComponent(
    nodes: SceneNode[],
    nodeId: string,
    compIdx: number | null,
    updater: (node: SceneNode, comp?: any) => SceneNode
): SceneNode[] {
    return nodes.map((n: SceneNode) => {
        if (n.id === nodeId) {
            if (compIdx !== null && n.components && n.components[compIdx]) {
                return updater(n, n.components[compIdx]);
            }
            return updater(n);
        }
        return { ...n, children: updateSceneGraphNodeAndComponent(n.children, nodeId, compIdx, updater) };
    });
}

// --- TransformComponent for editing position, rotation, scale ---
export function TransformComponent({ node, setSceneGraph }: {
    node: SceneNode;
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
}) {
    const t = node.transform || { position: null, rotation: null, scale: null };

    // Handles updating the transform directly in the scene graph
    const handleTransformChange = (field: 'position' | 'rotation' | 'scale', value: any) => {
        setSceneGraph(prev =>
            updateSceneGraphNodeAndComponent(prev, node.id, null, n => {
                const newTransform = { ...t };
                if (field === 'scale') {
                    newTransform.scale = value;
                } else {
                    newTransform[field] = value;
                }
                return { ...n, transform: newTransform };
            })
        );
    };

    return <>
        <div className="mt-2">
            <label>Position: </label>
            {[0, 1, 2].map(i => (
                <NumberInput
                    key={i}
                    value={t.position ? t.position[i] ?? null : null}
                    placeholder={["x", "y", "z"][i]}
                    style={{ width: 40, marginRight: 4 }}
                    onChange={v => {
                        const arr = t.position ? [...t.position] : [null, null, null];
                        arr[i] = v;
                        handleTransformChange('position', arr as [number, number, number]);
                    }}
                />
            ))}
        </div>
        <div className="mt-2">
            <label>Rotation: </label>
            {[0, 1, 2].map(i => (
                <NumberInput
                    key={i}
                    value={t.rotation ? t.rotation[i] ?? null : null}
                    placeholder={["x", "y", "z"][i]}
                    style={{ width: 40, marginRight: 4 }}
                    onChange={v => {
                        const arr = t.rotation ? [...t.rotation] : [null, null, null];
                        arr[i] = v;
                        handleTransformChange('rotation', arr as [number, number, number]);
                    }}
                />
            ))}
        </div>
        <div className="mt-2">
            <label>Scale: </label>
            <NumberInput
                value={t.scale ?? 1}
                placeholder="s"
                style={{ width: 40 }}
                onChange={v => {
                    handleTransformChange('scale', v);
                }}
            />
        </div>
    </>;
}
