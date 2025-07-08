import React from "react";
import { SceneNode } from "../SceneEditor";

// --- Prop Editor for material properties ---
type PropEditorProps = {
    type: string;
    value: any;
    onChange: (value: any) => void;
};
function PropEditor({ type, value, onChange }: PropEditorProps) {
    if (type === 'color') {
        return <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 40, height: 24, verticalAlign: 'middle' }} />;
    }
    if (type === 'number') {
        return <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: 60 }} />;
    }
    // fallback to text
    return <input type="text" value={value} onChange={e => onChange(e.target.value)} style={{ width: 80 }} />;
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
        <li style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>Mesh Standard Material</span>
            <div style={{ marginTop: 4, marginLeft: 8 }}>
                {propsDef.map(({ key, label, type: propType }) => (
                    <div key={key} style={{ marginBottom: 2 }}>
                        <label style={{ marginRight: 4 }}>{label || key}:</label>
                        <PropEditor
                            type={propType}
                            value={comp.props?.[key] ?? ''}
                            onChange={(newValue: any) => {
                                setSceneGraph((prev: SceneNode[]) => {
                                    function update(nodes: SceneNode[]): SceneNode[] {
                                        return nodes.map((n: SceneNode) => {
                                            if (n.id === node.id) {
                                                const newComponents = n.components.map((c: any, cidx: number) => {
                                                    if (cidx === idx) {
                                                        return {
                                                            ...c,
                                                            props: {
                                                                ...c.props,
                                                                [key]: newValue
                                                            }
                                                        };
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