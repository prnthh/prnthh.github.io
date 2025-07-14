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
        return <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-8 h-6 border border-white/20 bg-transparent cursor-pointer"
        />;
    }
    if (type === 'number') {
        return <input
            type="number"
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-16 bg-white/10 border border-white/20 text-white/90 text-xs px-2 py-1 focus:outline-none focus:border-white/40 transition-colors"
        />;
    }
    // fallback to text
    return <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-20 bg-white/10 border border-white/20 text-white/90 text-xs px-2 py-1 focus:outline-none focus:border-white/40 transition-colors"
    />;
}

// --- MaterialComponent for meshStandardMaterial ---
export function MaterialComponent({ node, setSceneGraph }: {
    node: SceneNode;
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
}) {
    // Find the meshStandardMaterial component
    const idx = node.components?.findIndex((c: any) => c.type === 'meshStandardMaterial');
    if (idx === undefined || idx === -1) return null;
    const comp = node.components[idx];
    const propsDef = [
        { key: 'color', label: 'Color', type: 'color' }
        // Add more material props here if needed
    ];
    return (
        <li className="mb-1 py-1 px-2 bg-white/5 border border-white/10">
            <span className="text-white/90 text-xs font-medium block mb-1">Mesh Standard Material</span>
            <div className="space-y-1">
                {propsDef.map(({ key, label, type: propType }) => (
                    <div key={key} className="flex items-center gap-2">
                        <label className="text-white/60 text-xs min-w-[40px]">{label || key}:</label>
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
        </li>
    );
}