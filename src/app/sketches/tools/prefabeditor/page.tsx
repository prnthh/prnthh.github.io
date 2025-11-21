"use client";

import GameCanvas from "@/shared/GameCanvas";
import { MapControls, TransformControls } from "@react-three/drei";
import { useState, useRef, useEffect, forwardRef } from "react";
import { DoubleSide, Group, Mesh, Object3D, SRGBColorSpace, Texture, TextureLoader } from "three";
import { Prefab, GameObject as GameObjectType } from "./types";
import { ThreeEvent } from "@react-three/fiber";
import { loadModel } from "../dragdrop/modelLoader";

const testPrefab: Prefab = {
    id: "prefab-1",
    name: "Test Prefab",
    root: {
        id: "root",
        enabled: true,
        visible: true,
        components: {
            transform: {
                type: "Transform",
                properties: {
                    position: [0, -1, 0],
                    rotation: [-Math.PI / 2, 0, 0],
                    scale: [1, 1, 1],
                },
            },
            geometry: {
                type: "Geometry",
                properties: {
                    geometryType: "plane",
                    args: [5, 5],
                },
            },
            material: {
                type: "Material",
                properties: {
                    color: "white",
                    texture: "/textures/grid-pattern.png"
                }
            }

        },
        children: [
            {
                id: "child-1",
                enabled: true,
                visible: true,
                components: {
                    transform: {
                        type: "Transform",
                        properties: {
                            position: [2, 0, 0],
                            rotation: [0, 0, 0],
                            scale: [0.8, 0.8, 0.8],
                        },
                    },
                    geometry: {
                        type: "Geometry",
                        properties: {
                            geometryType: "sphere",
                            args: [0.5, 32, 32],
                        },
                    },
                    material: {
                        type: "Material",
                        properties: {
                            color: "green",
                            wireframe: true,
                        },
                    },
                },
                children: [
                    {
                        id: "grandchild-1",
                        enabled: true,
                        visible: true,
                        components: {
                            transform: {
                                type: "Transform",
                                properties: {
                                    position: [0, 1, 0],
                                    rotation: [0, 0, 0],
                                    scale: [0.5, 0.5, 0.5],
                                },
                            },
                            geometry: {
                                type: "Geometry",
                                properties: {
                                    geometryType: "box",
                                    args: [1, 1, 1],
                                },
                            },
                            material: {
                                type: "Material",
                                properties: {
                                    color: "yellow",
                                    wireframe: true,
                                },
                            },
                        },
                    },
                ],
            },
            {
                id: "child-2",
                enabled: true,
                visible: true,
                components: {
                    transform: {
                        type: "Transform",
                        properties: {
                            position: [-2, 0, 0],
                            rotation: [0, 0, 0],
                            scale: [1, 1, 1],
                        },
                    },
                    geometry: {
                        type: "Geometry",
                        properties: {
                            geometryType: "sphere",
                            args: [0.5, 16, 16],
                        },
                    },
                    material: {
                        type: "Material",
                        properties: {
                            color: "blue",
                            wireframe: false,
                        },
                    },
                },
            },
            {
                id: "model-node",
                enabled: true,
                visible: true,
                components: {
                    transform: {
                        type: "Transform",
                        properties: {
                            position: [0, 0, 2],
                            rotation: [0, 0, 0],
                            scale: [1, 1, 1],
                        },
                    },
                    model: {
                        type: "Model",
                        properties: {
                            filename: "models/environment/tree.glb"
                        }
                    }
                }
            },
            {
                id: "model-node2",
                enabled: true,
                visible: true,
                components: {
                    transform: {
                        type: "Transform",
                        properties: {
                            position: [-2, 0, 2],
                            rotation: [0, 0, 0],
                            scale: [1, 1, 1],
                        },
                    },
                    model: {
                        type: "Model",
                        properties: {
                            filename: "models/environment/tree.glb"
                        }
                    }
                }
            },
            {
                id: "textured-node",
                enabled: true,
                visible: true,
                components: {
                    transform: {
                        type: "Transform",
                        properties: {
                            position: [2, 0, 2],
                            rotation: [0, 0, 0],
                            scale: [1, 1, 1],
                        },
                    },
                    geometry: {
                        type: "Geometry",
                        properties: {
                            geometryType: "box",
                            args: [1, 1, 1],
                        },
                    },
                    material: {
                        type: "Material",
                        properties: {
                            color: "red",
                            wireframe: true,
                        },
                    },
                }
            }
        ],
    }
};

export default function PrefabEditorPage() {
    const [loadedPrefab, setLoadedPrefab] = useState<Prefab>(testPrefab);
    const prefabRef = useRef<Group>(null);
    return <div className="w-screen h-screen">
        <GameCanvas>
            <ambientLight intensity={1.5} />
            <gridHelper args={[10, 10]} position={[0, -1, 0]} />
            <PrefabEditor editMode data={loadedPrefab} ref={prefabRef} />
        </GameCanvas>
    </div>
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

export const PrefabEditor = forwardRef<Group, { editMode?: boolean; data: Prefab }>(({ editMode, data }, ref) => {
    const [loadedModels, setLoadedModels] = useState<Record<string, Object3D>>({});
    const [loadedTextures, setLoadedTextures] = useState<Record<string, Texture>>({});
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [prefab, setPrefab] = useState<Prefab>(data);
    const objectRefs = useRef<Record<string, Object3D | null>>({});
    const loadingRefs = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!editMode)
            setSelectedId(null);
    }, [editMode]);


    const registerRef = (id: string, obj: Object3D | null) => {
        objectRefs.current[id] = obj;
    };

    useEffect(() => {
        const loadAssets = async () => {
            const modelsToLoad = new Set<string>();
            const texturesToLoad = new Set<string>();

            const traverse = (node: GameObjectType) => {
                if (node.components?.model?.properties?.filename) {
                    modelsToLoad.add(node.components.model.properties.filename);
                }
                if (node.components?.material?.properties?.texture) {
                    texturesToLoad.add(node.components.material.properties.texture);
                }
                node.children?.forEach(traverse);
            };
            traverse(prefab.root);

            for (const filename of modelsToLoad) {
                if (!loadedModels[filename] && !loadingRefs.current.has(filename)) {
                    loadingRefs.current.add(filename);
                    const result = await loadModel(filename, "");
                    if (result.success && result.model) {
                        setLoadedModels(prev => ({ ...prev, [filename]: result.model }));
                    }
                }
            }

            const textureLoader = new TextureLoader();
            for (const filename of texturesToLoad) {
                if (!loadedTextures[filename] && !loadingRefs.current.has(filename)) {
                    loadingRefs.current.add(filename);
                    textureLoader.load(filename, (texture) => {
                        texture.colorSpace = SRGBColorSpace;
                        setLoadedTextures(prev => ({ ...prev, [filename]: texture }));
                    });
                }
            }
        };
        loadAssets();
    }, [prefab, loadedModels, loadedTextures]);

    const onTransformChange = () => {
        if (!selectedId) return;
        const obj = objectRefs.current[selectedId];
        if (!obj) return;

        setPrefab(prev => {
            const newRoot = updatePrefabNode(prev.root, selectedId, (node) => {
                return {
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
                };
            });
            return { ...prev, root: newRoot };
        });
    };

    return <group ref={ref}>
        <GameObjectRenderer
            gameObject={prefab.root}
            selectedId={selectedId}
            onSelect={editMode ? setSelectedId : undefined}
            registerRef={registerRef}
            loadedModels={loadedModels}
            loadedTextures={loadedTextures}
        />
        {selectedId && objectRefs.current[selectedId] && (
            <TransformControls
                object={objectRefs.current[selectedId]}
                mode="translate"
                space="local"
                onObjectChange={onTransformChange}
            />
        )}

        <MapControls makeDefault />
    </group>;
});

interface GameObjectRendererProps {
    gameObject: GameObjectType;
    selectedId: string | null;
    onSelect?: (id: string) => void;
    registerRef: (id: string, obj: Object3D | null) => void;
    loadedModels: Record<string, Object3D>;
    loadedTextures: Record<string, Texture>;
}

function GameObjectRenderer({ gameObject, selectedId, onSelect, registerRef, loadedModels, loadedTextures }: GameObjectRendererProps) {
    const transform = gameObject.components?.transform;
    const geometry = gameObject.components?.geometry;
    const material = gameObject.components?.material;
    const modelComp = gameObject.components?.model;
    const isSelected = selectedId === gameObject.id;

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect?.(gameObject.id);
    };

    if (!gameObject.enabled || !gameObject.visible) {
        return null;
    }

    // Render geometry based on component
    const renderGeometry = () => {
        if (!geometry) return null;

        const { geometryType, args = [] } = geometry.properties;

        switch (geometryType) {
            case "box":
                return <boxGeometry args={args as [number, number, number]} />;
            case "sphere":
                return <sphereGeometry args={args as [number, number?, number?]} />;
            case "plane":
                return <planeGeometry args={args as [number, number]} />;
            default:
                return <boxGeometry args={[1, 1, 1]} />;
        }
    };

    // Render material based on component
    const renderMaterial = () => {
        if (!material) {
            return <meshStandardMaterial color="red" wireframe />;
        }

        const { color, wireframe = false, texture: textureName } = material.properties;
        const displayColor = isSelected ? "cyan" : color;
        const texture = textureName ? loadedTextures[textureName] : undefined;

        return <meshStandardMaterial
            key={texture?.uuid ?? 'no-texture'}
            color={displayColor}
            wireframe={wireframe}
            map={texture}
            transparent={!!texture}
            side={DoubleSide}
        />;
    };

    const renderModel = () => {
        if (!modelComp) return null;
        const filename = modelComp.properties.filename;
        const model = loadedModels[filename];
        if (!model) return null;
        return <primitive object={model.clone()} />;
    };

    return (
        <group
            ref={(el) => {
                registerRef(gameObject.id, el);
            }}
            onClick={handleClick}
            position={transform?.properties.position}
            rotation={transform?.properties.rotation}
            scale={transform?.properties.scale}
        >
            {geometry && (
                <mesh>
                    {renderGeometry()}
                    {renderMaterial()}
                </mesh>
            )}
            {renderModel()}

            {gameObject.children?.map((child) => (
                <GameObjectRenderer
                    key={child.id}
                    gameObject={child}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    registerRef={registerRef}
                    loadedModels={loadedModels}
                    loadedTextures={loadedTextures}
                />
            ))}
        </group>
    );
}