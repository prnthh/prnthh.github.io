import { button, useControls, folder } from 'leva'
import { RefObject, useEffect, useState, Dispatch, SetStateAction } from 'react';
import { TransformControls } from '@react-three/drei';
import { Prefab, GameObject as GameObjectType } from "./types";
import { Object3D } from 'three';

function EditorUI({ prefabData, setPrefabData, selectedId, setSelectedId, objectRefs }: {
    prefabData?: Prefab;
    setPrefabData?: Dispatch<SetStateAction<Prefab>>;
    selectedId: string | null;
    setSelectedId: Dispatch<SetStateAction<string | null>>;
    objectRefs: RefObject<Record<string, Object3D | null>>;
}) {
    useControls({
        name: 'prefab',
        save: button(() => {
            if (prefabData) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prefabData, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", (prefabData.name || 'prefab') + ".json");
                document.body.appendChild(downloadAnchorNode); // required for firefox
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            } else {
                console.warn('No prefab data to save');
            }
        }),
        load: button(() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = e => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = e => {
                    try {
                        const text = e.target?.result;
                        if (typeof text === 'string') {
                            const json = JSON.parse(text);
                            if (setPrefabData) {
                                setPrefabData(json);
                            } else {
                                console.warn('No setPrefabData function provided');
                            }
                        }
                    } catch (err) {
                        console.error('Error parsing prefab JSON:', err);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        })
    });

    const [transformMode, setTransformMode] = useState<"translate" | "rotate" | "scale">("rotate");

    const updateNode = (updater: (node: GameObjectType) => GameObjectType) => {
        if (!selectedId) return;
        setPrefabData?.(prev => {
            const newRoot = updatePrefabNode(prev.root, selectedId, updater);
            return { ...prev, root: newRoot };
        });
    };

    const onTransformChange = () => {
        if (!selectedId) return;
        const obj = objectRefs.current[selectedId];
        if (!obj) return;

        updateNode(node => ({
            ...node,
            components: {
                ...node.components,
                transform: {
                    type: "Transform",
                    properties: {
                        position: [obj.position.x, obj.position.y, obj.position.z],
                        rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                        scale: [obj.scale.x, obj.scale.y, obj.scale.z],
                    },
                },
                geometry: node.components?.geometry,
                material: node.components?.material,
                model: node.components?.model,
            }
        }));
    };

    useEffect(() => {
        return () => { setSelectedId(null); };
    }, []);

    const selectedNode = selectedId && prefabData ? findNode(prefabData.root, selectedId) : null;

    return <>
        {selectedId && objectRefs.current[selectedId] && (
            <TransformControls
                object={objectRefs.current[selectedId]}
                mode={transformMode}
                space="local"
                onObjectChange={onTransformChange}
            />
        )}
        {selectedNode && (
            <NodeInspector
                key={selectedNode.id}
                node={selectedNode}
                updateNode={updateNode}
                transformMode={transformMode}
                setTransformMode={setTransformMode}
            />
        )}
    </>;
}

const COMPONENT_DEFS: Record<string, { type: string, defaultProps: any }> = {
    transform: { type: 'Transform', defaultProps: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } },
    geometry: { type: 'Geometry', defaultProps: { geometryType: 'box' } },
    material: { type: 'Material', defaultProps: { color: '#ffffff' } },
    model: { type: 'Model', defaultProps: { filename: '' } },
    physics: { type: 'Physics', defaultProps: { type: 'dynamic' } }
};

function NodeInspector({ node, updateNode, transformMode, setTransformMode }: {
    node: GameObjectType;
    updateNode: (updater: (n: GameObjectType) => GameObjectType) => void;
    transformMode: "translate" | "rotate" | "scale";
    setTransformMode: (m: "translate" | "rotate" | "scale") => void;
}) {
    const [values, set] = useControls(node.id, () => {
        const schema: any = {
            'Transform Mode': {
                value: transformMode,
                options: ["translate", "rotate", "scale"],
                onChange: setTransformMode
            }
        };

        const removeComponent = (key: string) => {
            updateNode(n => {
                const components = { ...n.components };
                delete components[key as keyof typeof components];
                return { ...n, components };
            });
        };

        if (node.components?.transform) {
            const t = node.components.transform;
            schema.Transform = folder({
                position: {
                    value: t.properties.position,
                    onChange: (v: [number, number, number]) => {
                        updateNode(n => ({
                            ...n,
                            components: { ...n.components, transform: { ...n.components!.transform!, properties: { ...n.components!.transform!.properties, position: v } } }
                        }));
                    }
                },
                rotation: {
                    value: t.properties.rotation,
                    onChange: (v: [number, number, number]) => {
                        updateNode(n => ({
                            ...n,
                            components: { ...n.components, transform: { ...n.components!.transform!, properties: { ...n.components!.transform!.properties, rotation: v } } }
                        }));
                    }
                },
                scale: {
                    value: t.properties.scale,
                    onChange: (v: [number, number, number]) => {
                        updateNode(n => ({
                            ...n,
                            components: { ...n.components, transform: { ...n.components!.transform!, properties: { ...n.components!.transform!.properties, scale: v } } }
                        }));
                    }
                }
            });
        }

        if (node.components?.geometry) {
            const g = node.components.geometry;
            schema.Geometry = folder({
                type: {
                    value: g.properties.geometryType,
                    options: ["box", "sphere", "plane"],
                    onChange: (v: any) => {
                        updateNode(n => ({
                            ...n,
                            components: { ...n.components, geometry: { ...n.components!.geometry!, properties: { ...n.components!.geometry!.properties, geometryType: v } } }
                        }));
                    }
                },
                'Remove': button(() => removeComponent('geometry'))
            });
        }

        if (node.components?.material) {
            const m = node.components.material;
            schema.Material = folder({
                color: {
                    value: m.properties.color,
                    onChange: (v: string) => {
                        updateNode(n => ({
                            ...n,
                            components: { ...n.components, material: { ...n.components!.material!, properties: { ...n.components!.material!.properties, color: v } } }
                        }));
                    }
                },
                wireframe: {
                    value: m.properties.wireframe || false,
                    onChange: (v: boolean) => {
                        updateNode(n => ({
                            ...n,
                            components: { ...n.components, material: { ...n.components!.material!, properties: { ...n.components!.material!.properties, wireframe: v } } }
                        }));
                    }
                },
                'Remove': button(() => removeComponent('material'))
            });
        }

        if (node.components?.model) {
            const m = node.components.model;
            schema.Model = folder({
                filename: {
                    value: m.properties.filename,
                    onChange: (v: string) => {
                        updateNode(n => ({
                            ...n,
                            components: { ...n.components, model: { ...n.components!.model!, properties: { ...n.components!.model!.properties, filename: v } } }
                        }));
                    }
                },
                'Remove': button(() => removeComponent('model'))
            });
        }

        if (node.components?.physics) {
            const p = node.components.physics;
            schema.Physics = folder({
                type: {
                    value: p.properties.type,
                    options: ["dynamic", "fixed"],
                    onChange: (v: any) => {
                        updateNode(n => ({
                            ...n,
                            components: { ...n.components, physics: { ...n.components!.physics!, properties: { ...n.components!.physics!.properties, type: v } } }
                        }));
                    }
                },
                'Remove': button(() => removeComponent('physics'))
            });
        }

        const addButtons: any = {};
        Object.entries(COMPONENT_DEFS).forEach(([key, def]) => {
            // @ts-ignore
            if (!node.components?.[key]) {
                addButtons[def.type] = button(() => updateNode(n => ({
                    ...n,
                    components: {
                        ...n.components,
                        [key]: { type: def.type, properties: def.defaultProps }
                    }
                })));
            }
        });

        if (Object.keys(addButtons).length > 0) {
            schema['Add Component'] = folder(addButtons);
        }

        return schema;
    }, [node.id, node.components]);

    useEffect(() => {
        if (node.components?.transform) {
            set({
                position: node.components.transform.properties.position,
                rotation: node.components.transform.properties.rotation,
                scale: node.components.transform.properties.scale,
            });
        }
    }, [node.components?.transform?.properties, set]);

    return null;
}

function updatePrefabNode(root: GameObjectType, id: string, update: (node: GameObjectType) => GameObjectType): GameObjectType {
    if (root.id === id) {
        return update(root);
    }
    if (root.children) {
        return {
            ...root,
            children: root.children.map(child => updatePrefabNode(child, id, update))
        };
    }
    return root;
}

function findNode(root: GameObjectType, id: string): GameObjectType | null {
    if (root.id === id) return root;
    if (root.children) {
        for (const child of root.children) {
            const found = findNode(child, id);
            if (found) return found;
        }
    }
    return null;
}

export default EditorUI;
