"use client";

import { MapControls, TransformControls } from "@react-three/drei";
import { useState, useRef, useEffect, forwardRef, useMemo, useCallback } from "react";
import { Vector3, Euler, Quaternion, ClampToEdgeWrapping, DoubleSide, Group, Object3D, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader, Matrix4 } from "three";
import { Prefab, GameObject as GameObjectType } from "./types";
import { getComponent } from "./components/ComponentRegistry";
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
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    transformMode?: "translate" | "rotate" | "scale";
    setTransformMode?: (mode: "translate" | "rotate" | "scale") => void;
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
        if (!selectedId || !onPrefabChange) return;
        const obj = objectRefs.current[selectedId];
        if (!obj) return;

        // 1. Get world matrix from the actual Three object
        const worldMatrix = obj.matrixWorld.clone();

        // 2. Compute parent world matrix from the prefab tree
        const parentWorld = computeParentWorldMatrix(data.root, selectedId);
        const parentInv = parentWorld.clone().invert();

        // 3. Convert world -> local
        const localMatrix = new Matrix4().multiplyMatrices(parentInv, worldMatrix);

        const lp = new Vector3();
        const lq = new Quaternion();
        const ls = new Vector3();
        localMatrix.decompose(lp, lq, ls);

        const le = new Euler().setFromQuaternion(lq);

        // 4. Write back LOCAL transform into the prefab node
        const newRoot = updatePrefabNode(data.root, selectedId, (node) => ({
            ...node,
            components: {
                ...node.components,
                transform: {
                    type: "Transform",
                    properties: {
                        position: [lp.x, lp.y, lp.z] as [number, number, number],
                        rotation: [le.x, le.y, le.z] as [number, number, number],
                        scale: [ls.x, ls.y, ls.z] as [number, number, number],
                    },
                },
                geometry: node.components?.geometry,
                material: node.components?.material,
                model: node.components?.model,
            },
        }));

        onPrefabChange({ ...data, root: newRoot });
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
        <GameInstanceProvider models={loadedModels} onSelect={editMode ? onSelect : undefined} registerRef={registerRef}>
            <GameObjectRenderer
                gameObject={data.root}
                selectedId={selectedId}
                onSelect={editMode ? onSelect : undefined}
                registerRef={registerRef}
                loadedModels={loadedModels}
                loadedTextures={loadedTextures}
                editMode={editMode}
                parentMatrix={new Matrix4()}   // 👈 identity = world root
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
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    registerRef: (id: string, obj: Object3D | null) => void;
    loadedModels: Record<string, Object3D>;
    loadedTextures: Record<string, Texture>;
    editMode?: boolean;
    parentMatrix?: Matrix4;          // 👈 new
}


function GameObjectRenderer({
    gameObject,
    selectedId,
    onSelect,
    registerRef,
    loadedModels,
    loadedTextures,
    editMode,
    parentMatrix = new Matrix4(),   // 👈 default identity
}: GameObjectRendererProps) {

    const transform = gameObject.components?.transform;
    const geometry = gameObject.components?.geometry;
    const material = gameObject.components?.material;
    const modelComp = gameObject.components?.model;
    const physics = gameObject.components?.physics;
    const isSelected = selectedId === gameObject.id;

    // --- build local & world matrices ---
    const localPosArr = transform?.properties.position ?? [0, 0, 0];
    const localRotArr = transform?.properties.rotation ?? [0, 0, 0];
    const localScaleArr = transform?.properties.scale ?? [1, 1, 1];

    const localPos = new Vector3(...localPosArr);
    const localRot = new Euler(...localRotArr);
    const localScale = new Vector3(...localScaleArr);

    const localMatrix = new Matrix4().compose(
        localPos,
        new Quaternion().setFromEuler(localRot),
        localScale
    );

    const worldMatrix = parentMatrix.clone().multiply(localMatrix);


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

    // Render component views from registry
    const renderComponentViews = () => {
        if (!gameObject.components) return null;
        return Object.entries(gameObject.components).map(([key, comp]) => {
            const componentDef = getComponent(key);
            if (!componentDef || !componentDef.View || !comp) return null;
            return <componentDef.View key={key} properties={comp.properties} />;
        });
    };

    const isInstanced = modelComp?.properties?.instanced;

    // --- INSTANCED: terminal but inherits full parent hierarchy ---
    if (isInstanced) {
        const wp = new Vector3();
        const wq = new Quaternion();
        const ws = new Vector3();
        worldMatrix.decompose(wp, wq, ws);
        const we = new Euler().setFromQuaternion(wq);

        return (
            <GameInstance
                id={gameObject.id}
                modelUrl={modelComp!.properties.filename}
                position={[wp.x, wp.y, wp.z]}
                rotation={[we.x, we.y, we.z]}
                scale={[ws.x, ws.y, ws.z]}
                physics={editMode ? undefined : (physics?.properties as any)}
            />
        );
    }

    // --- NON-INSTANCED: children are nested, so transforms are relative ---

    const childrenNodes = gameObject.children?.map((child) => (
        <GameObjectRenderer
            key={child.id}
            gameObject={child}
            selectedId={selectedId}
            onSelect={onSelect}
            registerRef={registerRef}
            loadedModels={loadedModels}
            loadedTextures={loadedTextures}
            editMode={editMode}
            parentMatrix={worldMatrix}    // 👈 propagate
        />
    ));

    // Prepare context props and component defs
    const geometryDef = geometry ? getComponent('Geometry') : undefined;
    const materialDef = material ? getComponent('Material') : undefined;
    const contextProps = {
        loadedModels,
        loadedTextures,
        isSelected,
        editMode,
        parentMatrix,
        registerRef,
    };

    // All components except geometry, material, and model, rendered with generic props
    const allComponentViews = gameObject.components
        ? Object.entries(gameObject.components)
            .filter(([key]) => key !== 'geometry' && key !== 'material' && key !== 'model')
            .map(([key, comp]) => {
                const def = getComponent(key);
                if (!def || !def.View || !comp) return null;
                return <def.View key={key} properties={comp.properties} {...contextProps} />;
            })
        : null;

    // --- NESTING LOGIC ---
    // 1. Instanced: render as GameInstance, no children
    if (isInstanced) {
        const wp = new Vector3();
        const wq = new Quaternion();
        const ws = new Vector3();
        worldMatrix.decompose(wp, wq, ws);
        const we = new Euler().setFromQuaternion(wq);
        return (
            <GameInstance
                id={gameObject.id}
                modelUrl={modelComp!.properties.filename}
                position={[wp.x, wp.y, wp.z]}
                rotation={[we.x, we.y, we.z]}
                scale={[ws.x, ws.y, ws.z]}
                physics={editMode ? undefined : (physics?.properties as any)}
            />
        );
    }


    // Unified branch for model and geometry: both support children and material overrides
    if ((modelComp && modelComp.properties && !modelComp.properties.instanced && modelComp.properties.filename && loadedModels[modelComp.properties.filename]) || (geometry && geometryDef && geometryDef.View)) {
        let content: React.ReactNode = null;
        if (modelComp && modelComp.properties && !modelComp.properties.instanced && modelComp.properties.filename && loadedModels[modelComp.properties.filename]) {
            const modelObj = loadedModels[modelComp.properties.filename].clone();
            content = (
                <primitive object={modelObj}>
                    {material && materialDef && materialDef.View && (
                        <materialDef.View
                            key="material"
                            properties={material.properties}
                            loadedTextures={loadedTextures}
                            isSelected={isSelected}
                            editMode={editMode}
                            parentMatrix={parentMatrix}
                            registerRef={registerRef}
                        />
                    )}
                    {allComponentViews}
                    {childrenNodes}
                </primitive>
            );
        } else if (geometry && geometryDef && geometryDef.View) {
            content = (
                <mesh>
                    <geometryDef.View key="geometry" properties={geometry.properties} {...contextProps} />
                    {material && materialDef && materialDef.View && (
                        <materialDef.View
                            key="material"
                            properties={material.properties}
                            loadedTextures={loadedTextures}
                            isSelected={isSelected}
                            editMode={editMode}
                            parentMatrix={parentMatrix}
                            registerRef={registerRef}
                        />
                    )}
                    {allComponentViews}
                    {childrenNodes}
                </mesh>
            );
        }
        // Always apply transform to the group, not the mesh, so physics and edit mode both preserve transform
        let groupContent = content;
        if (physics && !editMode) {
            const physicsDef = getComponent('Physics');
            if (physicsDef && physicsDef.View) {
                groupContent = (
                    <physicsDef.View
                        properties={{ ...physics.properties, id: gameObject.id }}
                        registerRef={registerRef}
                        editMode={editMode}
                    >
                        {content}
                    </physicsDef.View>
                );
            }
        }
        // Always apply transform to the group, never to the physics component
        return (
            <group
                ref={el => registerRef(gameObject.id, el)}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                position={transform?.properties.position}
                rotation={transform?.properties.rotation}
                scale={transform?.properties.scale}
            >
                {groupContent}
            </group>
        );
    }

    // 4. Default: just a group, all components and children inside
    let groupContent = <>
        {allComponentViews}
        {childrenNodes}
    </>;
    if (physics) {
        const physicsDef = getComponent('Physics');
        if (physicsDef && physicsDef.View) {
            groupContent = (
                <physicsDef.View
                    properties={{ ...physics.properties, id: gameObject.id }}
                    registerRef={registerRef}
                    editMode={editMode}
                >
                    {groupContent}
                </physicsDef.View>
            );
        }
    }
    // Always apply transform to the group, never to the physics component
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
            {groupContent}
        </group>
    );

}





export default PrefabRoot;

function getNodeTransformProps(node: GameObjectType) {
    const t = node.components?.transform?.properties;
    return {
        position: t?.position ?? [0, 0, 0],
        rotation: t?.rotation ?? [0, 0, 0],
        scale: t?.scale ?? [1, 1, 1],
    };
}

function computeParentWorldMatrix(root: GameObjectType, targetId: string): Matrix4 {
    const identity = new Matrix4();

    function traverse(node: GameObjectType, parentWorld: Matrix4): Matrix4 | null {
        if (node.id === targetId) {
            // parentWorld is what we want
            return parentWorld.clone();
        }

        const { position, rotation, scale } = getNodeTransformProps(node);

        const localPos = new Vector3(...position);
        const localRot = new Euler(...rotation);
        const localScale = new Vector3(...scale);

        const localMat = new Matrix4().compose(
            localPos,
            new Quaternion().setFromEuler(localRot),
            localScale
        );

        const worldMat = parentWorld.clone().multiply(localMat);

        if (node.children) {
            for (const child of node.children) {
                const res = traverse(child, worldMat);
                if (res) return res;
            }
        }

        return null;
    }

    return traverse(root, identity) ?? identity;
}
