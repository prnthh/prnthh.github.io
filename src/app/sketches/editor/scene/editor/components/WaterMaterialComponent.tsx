import React from "react";
import { SceneNode } from "../../viewer/SceneViewer";
import { updateSceneGraphNodeAndComponent } from "./TransformComponent";

// --- Prop Editor for material properties ---
type PropEditorProps = {
    type: string;
    value: any;
    onChange: (value: any) => void;
};
function PropEditor({ type, value, onChange }: PropEditorProps) {
    if (type === 'color') {
        return <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-6 align-middle" />;
    }
    if (type === 'number') {
        return <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-15" />;
    }
    // fallback to text
    return <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-20" />;
}

// --- MaterialComponent for meshStandardMaterial ---
export function WaterMaterialComponent({ node, setSceneGraph }: {
    node: SceneNode;
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
}) {
    // Find the meshStandardMaterial component
    const idx = node.components?.findIndex((c: any) => c.type === 'waterMaterial');
    if (idx === undefined || idx === -1) return null;
    const comp = node.components[idx];
    const propsDef = [
        { key: 'color', label: 'Color', type: 'color' }
        // Add more material props here if needed
    ];
    return (
        <div className="mb-2">
            <span className="font-medium">Water Material</span>
            <div className="mt-1 ml-2">
                {propsDef.map(({ key, label, type: propType }) => (
                    <div key={key} className="mb-0.5">
                        <label className="mr-1">{label || key}:</label>
                        <PropEditor
                            type={propType}
                            value={comp.props?.[key] ?? ''}
                            onChange={(newValue: any) => {
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
                                                            [key]: newValue
                                                        }
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