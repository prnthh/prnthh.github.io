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
        <li className="mb-1 py-1 px-2 bg-white/5 border border-white/10">
            <span className="text-white/90 text-xs font-medium block mb-1">Box Geometry</span>
            <div className="space-y-1">
                {[0, 1, 2].map(i => (
                    <div key={i} className="flex items-center gap-2">
                        <label className="text-white/60 text-xs min-w-[45px]">{['Width', 'Height', 'Depth'][i]}:</label>
                        <NumberInput
                            value={args[i] ?? null}
                            placeholder={['w', 'h', 'd'][i]}
                            className="w-12"
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
        </li>
    );
}
