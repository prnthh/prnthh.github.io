import React from "react";
import NumberInput from "../ui/NumberInput";
import { SceneNode } from "../../viewer/SceneViewer";
import { updateSceneGraphNodeAndComponent } from "./TransformComponent";

// --- GeometryComponent for boxGeometry ---
export function GeometryComponent({ node, setSceneGraph }: {
    node: SceneNode;
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
}) {
    // Find the boxGeometry component
    const idx = node.components?.findIndex((c: any) => c.type === 'boxGeometry');
    if (idx === undefined || idx === -1) return null;
    const comp = node.components[idx];
    const args = comp.args || [1, 1, 1];
    return (
        <div className="mb-2">
            <span className="font-medium">Box Geometry</span>
            <div className="mt-1 ml-2">
                {[0, 1, 2].map(i => (
                    <div key={i} className="mb-0.5">
                        <label className="mr-1">{['Width', 'Height', 'Depth'][i]}:</label>
                        <NumberInput
                            value={args[i] ?? null}
                            placeholder={['w', 'h', 'd'][i]}
                            style={{ width: 40, marginRight: 4 }}
                            onChange={v => {
                                setSceneGraph(prev =>
                                    updateSceneGraphNodeAndComponent(
                                        prev,
                                        node.id,
                                        idx,
                                        (n, c) => ({
                                            ...n,
                                            components: n.components.map((compItem: any, cidx: number) =>
                                                cidx === idx
                                                    ? {
                                                        ...compItem,
                                                        args: [
                                                            ...(compItem.args || [1, 1, 1]).map((val: any, j: number) =>
                                                                j === i ? v ?? 1 : val
                                                            )
                                                        ]
                                                    }
                                                    : compItem
                                            )
                                        })
                                    )
                                );
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
