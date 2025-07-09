import React from "react";
import { SceneNode } from "../SceneEditor";

// --- ModelComponent for model component ---
export function ModelComponent({ node }: {
    node: SceneNode;
}) {
    // Find the model component
    const idx = node.components?.findIndex((c: any) => c.type === 'model');
    if (idx === undefined || idx === -1) return null;
    const comp = node.components[idx];
    return (
        <li style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Model</span>
            <div style={{ marginTop: 4, marginLeft: 8 }}>
                <div>
                    <label style={{ marginRight: 4 }}>Name:</label>
                    <span>{comp.object?.name || 'Unnamed Model'}</span>
                </div>
                <div>
                    <label style={{ marginRight: 4 }}>Type:</label>
                    <span>{comp.object?.type || 'Unknown'}</span>
                </div>
            </div>
        </li>
    );
}
