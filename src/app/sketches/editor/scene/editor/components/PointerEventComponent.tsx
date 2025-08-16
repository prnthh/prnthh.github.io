import React from "react";
import { updateSceneGraphNodeAndComponent } from "./TransformComponent";

// Editor for pointerEvent component
export function PointerEventComponent({ node, setSceneGraph }: {
    node: any;
    setSceneGraph: React.Dispatch<React.SetStateAction<any[]>>;
}) {
    const idx = node.components?.findIndex((c: any) => c.type === 'pointerEvent');
    if (idx === undefined || idx === -1) return null;
    const comp = node.components[idx];
    const mode = comp.args?.[0] === 'link' ? 'link' : 'event';
    const url = comp.args?.[1] || '';

    // Use updateSceneGraphNodeAndComponent for recursive updates
    const handleModeChange = (newMode: string) => {
        setSceneGraph(prev =>
            updateSceneGraphNodeAndComponent(
                prev,
                node.id,
                idx,
                (n: any, c: any) => ({
                    ...n,
                    components: n.components.map((compItem: any, cidx: number) =>
                        cidx === idx
                            ? {
                                ...compItem,
                                args: newMode === 'link' ? ['link', url] : ['event']
                            }
                            : compItem
                    )
                })
            )
        );
    };

    const handleUrlChange = (newUrl: string) => {
        setSceneGraph(prev =>
            require('./TransformComponent').updateSceneGraphNodeAndComponent(
                prev,
                node.id,
                idx,
                (n: any, c: any) => ({
                    ...n,
                    components: n.components.map((compItem: any, cidx: number) =>
                        cidx === idx
                            ? {
                                ...compItem,
                                args: ['link', newUrl]
                            }
                            : compItem
                    )
                })
            )
        );
    };

    return (
        <div className="mb-2">
            <label className="font-medium mr-2">Pointer Event</label>
            <select
                value={mode}
                onChange={e => handleModeChange(e.target.value)}
                className="ml-2 px-1 py-0.5 border rounded"
            >
                <option value="event">Event</option>
                <option value="link">Link</option>
            </select>
            {mode === 'link' && (
                <div className="mt-2 ml-2">
                    <label className="mr-1">URL:</label>
                    <input
                        type="text"
                        value={url}
                        placeholder="https://..."
                        style={{ width: 180, marginRight: 4 }}
                        onChange={e => handleUrlChange(e.target.value)}
                    />
                </div>
            )}
        </div>
    );
}
