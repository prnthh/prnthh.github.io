import React from "react";
import { SceneNode } from "../../viewer/SceneViewer";
import { updateSceneGraphNodeAndComponent } from "./TransformComponent";

// --- PhysicsComponent for physics ---
export function PhysicsComponent({ node, setSceneGraph }: {
    node: SceneNode;
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
}) {
    // Find the physics component
    const idx = node.components?.findIndex((c: any) => c.type === 'physics');
    if (idx === undefined || idx === -1) return null;
    const comp = node.components[idx];
    const type = comp.props?.type || 'fixed';
    return (
        <li style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Physics</span>
            <div style={{ marginTop: 4, marginLeft: 8 }}>
                <label style={{ marginRight: 4 }}>Type:</label>
                <select
                    value={type}
                    onChange={e => {
                        const newType = e.target.value;
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
                                                props: {
                                                    ...compItem.props,
                                                    type: newType
                                                }
                                            }
                                            : compItem
                                    )
                                })
                            )
                        );
                    }}
                >
                    <option value="fixed">Fixed</option>
                    <option value="dynamic">Dynamic</option>
                </select>
            </div>
        </li>
    );
}
