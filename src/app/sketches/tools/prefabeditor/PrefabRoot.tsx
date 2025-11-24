"use client";

import { MapControls, TransformControls } from "@react-three/drei";
import { useState, useRef, useEffect, forwardRef, useMemo, useCallback } from "react";
import { ClampToEdgeWrapping, DoubleSide, Group, Object3D, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from "three";
import { Prefab, GameObject as GameObjectType } from "./types";
import { ThreeEvent } from "@react-three/fiber";
import { loadModel } from "../dragdrop/modelLoader";
import { RigidBody } from "@react-three/rapier";
import { GameInstance, GameInstanceProvider } from "./InstanceProvider";

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

export const PrefabRoot = forwardRef<Group, {
    editMode?: boolean;
    data: Prefab;
    onPrefabChange?: (data: Prefab) => void;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    transformMode: "translate" | "rotate" | "scale";
    setTransformMode: (mode: "translate" | "rotate" | "scale") => void;
}>(({ editMode, data, onPrefabChange, selectedId, onSelect, transformMode, setTransformMode }, ref) => {
    const [loadedModels, setLoadedModels] = useState<Record<string, Object3D>>({});
    const [loadedTextures, setLoadedTextures] = useState<Record<string, Texture>>({});
    // const [prefabRoot, setPrefabRoot] = useState<Prefab>(data); // Removed local state
    const loadingRefs = useRef<Set<string>>(new Set());
    const objectRefs = useRef<Record<string, Object3D | null>>({});
    const [selectedObject, setSelectedObject] = useState<Object3D | null>(null);

    const registerRef = useCallback((id: string, obj: Object3D | null) => {
        objectRefs.current[id] = obj;
        if (id === selectedId) {
            setSelectedObject(obj);
        }
    }, [selectedId]);

    useEffect(() => {
        if (selectedId) {
            setSelectedObject(objectRefs.current[selectedId] || null);
        } else {
            setSelectedObject(null);
        }
    }, [selectedId]);


    // const [transformMode, setTransformMode] = useState<"translate" | "rotate" | "scale">("translate"); // Removed local state

    const updateNode = (updater: (node: GameObjectType) => GameObjectType) => {
        if (!selectedId || !onPrefabChange) return;
        const newRoot = updatePrefabNode(data.root, selectedId, updater);
        onPrefabChange({ ...data, root: newRoot });
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
            traverse(data.root);

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
    }, [data, loadedModels, loadedTextures]);



    return <group ref={ref}>
        <GameInstanceProvider models={loadedModels}>
            <GameObjectRenderer
                gameObject={data.root}
                selectedId={selectedId}
                onSelect={editMode ? onSelect : undefined}
                registerRef={registerRef}
                loadedModels={loadedModels}
                loadedTextures={loadedTextures}
                editMode={editMode}
            />
        </GameInstanceProvider>

        {editMode && <>
            <MapControls makeDefault />

            {selectedId && selectedObject && (
                <TransformControls
                    object={selectedObject}
                    mode={transformMode}
                    space="local"
                    onObjectChange={onTransformChange}
                />
            )}
        </>}
    </group>;
});

interface GameObjectRendererProps {
    gameObject: GameObjectType;
    selectedId: string | null;
    onSelect?: (id: string) => void;
    registerRef: (id: string, obj: Object3D | null) => void;
    loadedModels: Record<string, Object3D>;
    loadedTextures: Record<string, Texture>;
    editMode?: boolean;
}

function GameObjectRenderer({ gameObject, selectedId, onSelect, registerRef, loadedModels, loadedTextures, editMode }: GameObjectRendererProps) {
    const transform = gameObject.components?.transform;
    const geometry = gameObject.components?.geometry;
    const material = gameObject.components?.material;
    const modelComp = gameObject.components?.model;
    const physics = gameObject.components?.physics;
    const isSelected = selectedId === gameObject.id;

    const clickValid = useRef(false);
    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        clickValid.current = true;
    };
    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (clickValid.current) clickValid.current = false;
    };
    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        if (clickValid.current) {
            e.stopPropagation();
            onSelect?.(gameObject.id);
        }
        clickValid.current = false;
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



    const renderModel = () => {
        if (!modelComp) return null;
        const filename = modelComp.properties.filename;
        if (modelComp.properties.instanced) return null; // Handled by GameInstance wrapper

        const model = loadedModels[filename];
        if (!model) return null;
        return <primitive object={model.clone()} />;
    };

    const renderSpotLight = () => {
        const light = gameObject.components?.spotLight;
        if (!light) return null;
        const { color, intensity } = light.properties;
        return <spotLight color={color} intensity={intensity} />;
    };

    const isInstanced = modelComp?.properties?.instanced;

    const content = (
        <>
            {geometry && (
                <mesh>
                    {renderGeometry()}
                    <MaterialRenderer material={material} isSelected={isSelected} loadedTextures={loadedTextures} />
                </mesh>
            )}
            {renderModel()}
            {renderSpotLight()}

            {gameObject.children?.map((child) => (
                <GameObjectRenderer
                    key={child.id}
                    gameObject={child}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    registerRef={registerRef}
                    loadedModels={loadedModels}
                    loadedTextures={loadedTextures}
                    editMode={editMode}
                />
            ))}
        </>
    );

    if (isInstanced) {
        return <GameInstance
            ref={(el) => { registerRef(gameObject.id, el); }}
            id={gameObject.id}
            modelUrl={modelComp!.properties.filename}
            position={transform?.properties.position || [0, 0, 0]}
            rotation={transform?.properties.rotation || [0, 0, 0]}
            scale={transform?.properties.scale || [1, 1, 1]}
            physics={editMode ? undefined : (physics?.properties as any)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {content}
        </GameInstance>;
    }

    if (!editMode && physics) {
        return (
            <RigidBody
                ref={(el) => { registerRef(gameObject.id, el as unknown as Object3D); }}
                position={transform?.properties.position}
                rotation={transform?.properties.rotation}
                scale={transform?.properties.scale}
                type={physics.properties.type}
                colliders="cuboid"
            >
                <group
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    {content}
                </group>
            </RigidBody>
        );
    }

    return (
        <group
            ref={(el) => {
                registerRef(gameObject.id, el);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            position={transform?.properties.position}
            rotation={transform?.properties.rotation}
            scale={transform?.properties.scale}
        >
            {content}
        </group>
    );
}

function MaterialRenderer({ material, isSelected, loadedTextures }: { material: any, isSelected: boolean, loadedTextures: Record<string, Texture> }) {
    const textureName = material?.properties?.texture;
    const repeat = material?.properties?.repeat;
    const repeatCount = material?.properties?.repeatCount;

    const texture = textureName ? loadedTextures[textureName] : undefined;

    const finalTexture = useMemo(() => {
        if (!texture) return undefined;
        const t = texture.clone();
        if (repeat) {
            t.wrapS = t.wrapT = RepeatWrapping;
            if (repeatCount) t.repeat.set(repeatCount[0], repeatCount[1]);
        } else {
            t.wrapS = t.wrapT = ClampToEdgeWrapping;
            t.repeat.set(1, 1);
        }
        t.needsUpdate = true;
        return t;
    }, [texture, repeat, repeatCount?.[0], repeatCount?.[1]]);

    if (!material) {
        return <meshStandardMaterial color="red" wireframe />;
    }

    const { color, wireframe = false } = material.properties;
    const displayColor = isSelected ? "cyan" : color;

    return <meshStandardMaterial
        key={finalTexture?.uuid ?? 'no-texture'}
        color={displayColor}
        wireframe={wireframe}
        map={finalTexture}
        transparent={!!finalTexture}
        side={DoubleSide}
    />;
}

export default PrefabRoot;