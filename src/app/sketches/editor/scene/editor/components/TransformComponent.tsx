import React from "react";
import NumberInput from "../ui/NumberInput";
import { SceneNode } from "../SceneEditor";

// --- TransformComponent for editing position, rotation, scale ---
export function TransformComponent({ node, setSceneGraph }: {
    node: SceneNode;
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
}) {
    const t = node.transform || { position: null, rotation: null, scale: null };

    // Handles updating the transform directly in the scene graph
    const handleTransformChange = (field: 'position' | 'rotation' | 'scale', value: any) => {
        setSceneGraph(prev => {
            function update(nodes: SceneNode[]): SceneNode[] {
                return nodes.map(n => {
                    if (n.id === node.id) {
                        let newTransform = { ...t };
                        if (field === 'scale') {
                            newTransform.scale = value;
                        } else {
                            newTransform[field] = value;
                        }
                        return { ...n, transform: newTransform };
                    }
                    return { ...n, children: update(n.children) };
                });
            }
            return update(prev);
        });
    };

    return <>
        <div style={{ marginTop: 8 }}>
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
        <div style={{ marginTop: 8 }}>
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
        <div style={{ marginTop: 8 }}>
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
