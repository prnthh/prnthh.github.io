
import { MapControls, TransformControls } from "@react-three/drei";
import { useState, useRef, useEffect, forwardRef } from "react";
import { DoubleSide, Group, Object3D, SRGBColorSpace, Texture, TextureLoader } from "three";
import { Prefab, GameObject as GameObjectType } from "./types";
import { ThreeEvent } from "@react-three/fiber";
import { loadModel } from "../dragdrop/modelLoader";
import { RigidBody } from "@react-three/rapier";
import { GameInstance, GameInstanceProvider } from "./InstanceProvider";
import EditorUI from "./EditorUI";


export const PrefabEditor = forwardRef<Group, { editMode?: boolean; data: Prefab }>(({ editMode, data }, ref) => {
    const [loadedModels, setLoadedModels] = useState<Record<string, Object3D>>({});
    const [loadedTextures, setLoadedTextures] = useState<Record<string, Texture>>({});
    const [prefabRoot, setPrefabRoot] = useState<Prefab>(data);
    const loadingRefs = useRef<Set<string>>(new Set());
    const objectRefs = useRef<Record<string, Object3D | null>>({});
    const [selectedId, setSelectedId] = useState<string | null>(null);

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
            traverse(prefabRoot.root);

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
    }, [prefabRoot, loadedModels, loadedTextures]);



    return <group ref={ref}>
        <GameInstanceProvider models={loadedModels}>
            <GameObjectRenderer
                gameObject={prefabRoot.root}
                selectedId={selectedId}
                onSelect={editMode ? setSelectedId : undefined}
                registerRef={registerRef}
                loadedModels={loadedModels}
                loadedTextures={loadedTextures}
                editMode={editMode}
            />
        </GameInstanceProvider>

        {editMode && <>
            <EditorUI
                prefabData={prefabRoot}
                setPrefabData={setPrefabRoot}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                objectRefs={objectRefs}
            />
            <MapControls makeDefault />
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
        // @ts-ignore
        if (modelComp.properties.instanced) return null; // Handled by GameInstance wrapper

        const model = loadedModels[filename];
        if (!model) return null;
        return <primitive object={model.clone()} />;
    };

    // @ts-ignore
    const isInstanced = modelComp?.properties?.instanced;

    const content = (
        <>
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

export default PrefabEditor;