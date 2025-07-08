import React from "react";
import { SceneNode } from "../SceneEditor";
import NumberInput from "../ui/NumberInput";

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
        <li style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Box Geometry</span>
            <div style={{ marginTop: 4, marginLeft: 8 }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{ marginBottom: 2 }}>
                        <label style={{ marginRight: 4 }}>{['Width', 'Height', 'Depth'][i]}:</label>
                        <NumberInput
                            value={args[i] ?? null}
                            placeholder={['w', 'h', 'd'][i]}
                            style={{ width: 40, marginRight: 4 }}
                            onChange={v => {
                                setSceneGraph((prev: SceneNode[]) => {
                                    function update(nodes: SceneNode[]): SceneNode[] {
                                        return nodes.map((n: SceneNode) => {
                                            if (n.id === node.id) {
                                                const newComponents = n.components.map((c: any, cidx: number) => {
                                                    if (cidx === idx) {
                                                        const newArgs = [...(c.args || [1, 1, 1])];
                                                        newArgs[i] = v ?? 1;
                                                        return { ...c, args: newArgs };
                                                    }
                                                    return c;
                                                });
                                                return { ...n, components: newComponents };
                                            }
                                            return { ...n, children: update(n.children) };
                                        });
                                    }
                                    return update(prev);
                                });
                            }}
                        />
                    </div>
                ))}
            </div>
        </li>
    );
}
