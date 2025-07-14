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
        <li className="mb-1 py-1 px-2 bg-white/5 border border-white/10">
            <span className="text-white/90 text-xs font-medium block mb-1">Physics</span>
            <div className="flex items-center gap-2">
                <label className="text-white/60 text-xs min-w-[35px]">Type:</label>
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
                    className="flex-1 bg-white/10 border border-white/20 text-white/90 text-xs px-2 py-1 focus:outline-none focus:border-white/40 transition-colors"
                >
                    <option value="fixed" className="bg-gray-800 text-white">Fixed</option>
                    <option value="dynamic" className="bg-gray-800 text-white">Dynamic</option>
                </select>
            </div>
        </li>
    );
}
