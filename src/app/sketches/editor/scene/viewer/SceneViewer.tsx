import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import { Object3D, Object3DEventMap } from "three";
import { GameInstance, GameInstanceProvider } from "../editor/InstanceProvider";
import * as THREE from "three";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { useEditorContext } from "../editor/EditorContext";

export enum EditorModes {
    Edit = "edit",
    Play = "play",
    Pause = "pause",
}

export type SceneNode = {
    id: string;
    name: string;
    children: SceneNode[];
    components: any[];
    transform?: {
        position?: [number, number, number] | null;
        rotation?: [number, number, number] | null;
        scale?: number | null;
    } | null;
};

function injectModels(nodes: SceneNode[], models: { [filename: string]: any }): SceneNode[] {
    return nodes.map(node => ({
        ...node,
        components: node.components?.map((comp: any) =>
            comp.type === 'model' && typeof comp.filename === 'string'
                ? { ...comp, object: models[comp.filename] }
                : comp
        ) ?? [],
        children: injectModels(node.children, models)
    }));
}

function updateNodeTransform(nodes: SceneNode[], id: string, transform: any): SceneNode[] {
    return nodes.map(n => n.id === id
        ? { ...n, transform: { ...n.transform, ...transform } }
        : { ...n, children: updateNodeTransform(n.children, id, transform) }
    );
}

function nodeExists(nodes: SceneNode[], id: string | null): boolean {
    if (!id) return false;
    return nodes.some(node => node.id === id || nodeExists(node.children, id));
}

function isPhysicsObject(node: SceneNode, playMode: EditorModes): boolean {
    return playMode === EditorModes.Play &&
        node.components?.some(c => c.type === 'physics') &&
        node.name !== 'Root' &&
        !node.components?.find(c => c.type === 'model')?.instanced;
}

function cloneObject(object: Object3D): Object3D | null {
    const clone = object?.clone?.();
    if (clone) {
        clone.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
    return clone;
}

export function Viewer() {
    const { sceneGraph, setSceneGraph, models, selectedNodeId, setSelectedNodeId, getNodeRef, playMode } = useEditorContext();

    useEffect(() => {
        if (selectedNodeId && !nodeExists(sceneGraph, selectedNodeId)) {
            setSelectedNodeId(null);
        }
    }, [sceneGraph, selectedNodeId, setSelectedNodeId]);

    const selectedRef = selectedNodeId ? getNodeRef(selectedNodeId) : undefined;
    const isEditMode = playMode === EditorModes.Edit;

    return (
        <>
            <GameInstanceProvider models={models}>
                <RecursiveNode
                    node={injectModels(sceneGraph, models)[0]}
                    onSelect={setSelectedNodeId}
                    selectedNodeId={selectedNodeId}
                    setSceneGraph={setSceneGraph}
                    getNodeRef={getNodeRef}
                    playMode={playMode}
                />
            </GameInstanceProvider>

            {isEditMode && (
                <>
                    <OrbitControls makeDefault />
                    <gridHelper args={[10, 10]} />
                    {selectedNodeId && selectedRef?.current && selectedRef.current instanceof Object3D && nodeExists(sceneGraph, selectedNodeId) && (
                        <TransformControls
                            object={selectedRef.current}
                            mode="translate"
                            onObjectChange={() => {
                                const obj = selectedRef.current as Object3D | null;
                                if (obj) {
                                    setSceneGraph(prev => updateNodeTransform(prev, selectedNodeId, {
                                        position: [obj.position.x, obj.position.y, obj.position.z],
                                    }));
                                }
                            }}
                        />
                    )}
                </>
            )}
        </>
    );
}

export default function RecursiveNode({ node, onSelect, selectedNodeId, setSceneGraph, getNodeRef, playMode }: {
    node: SceneNode;
    onSelect: (id: string) => void;
    selectedNodeId: string | null;
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>;
    getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>;
    playMode: EditorModes;
}) {
    const ref = useRef<RapierRigidBody>(null);
    const groupRef = getNodeRef(node.id);
    const position = node.transform?.position?.map(v => v ?? 0) as [number, number, number] | undefined;
    const rotation = node.transform?.rotation?.map(v => v ?? 0) as [number, number, number] | undefined;
    const scale = node.transform?.scale ?? 1;

    const renderChildren = () => node.children?.map((child, index) => (
        <RecursiveNode
            key={child.id || index}
            node={child}
            onSelect={onSelect}
            selectedNodeId={selectedNodeId}
            setSceneGraph={setSceneGraph}
            getNodeRef={getNodeRef}
            playMode={playMode}
        />
    ));

    // Physics rendering in play mode
    if (isPhysicsObject(node, playMode)) {
        const model = node.components?.find(c => c.type === 'model');
        const physicsType = node.components?.find(c => c.type === 'physics')?.props?.type || 'dynamic';

        if (model?.object) {
            return <RigidModel object={model.object} node={node} position={position} rotation={rotation} scale={scale} />;
        }

        return (
            <RigidBody ref={ref} colliders="hull" position={position || [0, 0, 0]} rotation={rotation} scale={scale} type={physicsType}>
                <mesh castShadow receiveShadow>
                    <ComponentMapper node={node} />
                </mesh>
                {renderChildren()}
            </RigidBody>
        );
    }

    // Pointer event support
    const pointerEventComp = node.components?.find(c => c.type === 'pointerEvent');
    const hasPointerEvent = !!pointerEventComp;
    const handlePointerDown = (e: any) => {
        if (hasPointerEvent) {
            const mode = pointerEventComp.args?.[0] || 'event';
            if (mode === 'link') {
                const url = pointerEventComp.args?.[1];
                if (url) {
                    window.open(url, '_blank');
                }
            } else {
                window.dispatchEvent(new CustomEvent('scene-pointer-event', { detail: { name: node.name } }));
            }
            console.log(`Pointer event on node: ${node.name}`);
            e.stopPropagation();
        }

        if (playMode === EditorModes.Edit && node.id) {
            e.stopPropagation();
            onSelect(node.id);
        }
    };

    // Regular rendering
    return (
        <group ref={groupRef} position={position || [0, 0, 0]} rotation={rotation} scale={scale}>
            <mesh onPointerDown={handlePointerDown} castShadow receiveShadow>
                <ComponentMapper node={node} />
                {renderChildren()}
            </mesh>
        </group>
    );
}

const ComponentMapper = ({ node }: { node: SceneNode }) => {
    const geometry = node.components?.find(c => c.type === 'boxGeometry');
    const material = node.components?.find(c => c.type === 'meshStandardMaterial');
    const model = node.components?.find(c => c.type === 'model');

    return (
        <>
            {geometry && <boxGeometry args={geometry.args || [1, 1, 1]} />}
            {material && <meshStandardMaterial {...material.props} />}
            {model && (model.object ? (
                model.instanced ? (
                    <GameInstance
                        modelUrl={model.filename || ''}
                        position={node.transform?.position || [0, 0, 0]}
                        rotation={node.transform?.rotation || [0, 0, 0]}
                        physics={node.components.find(c => c.type === 'physics')}
                    />
                ) : (
                    <ClonedModel object={model.object} />
                )
            ) : (
                <ExclamationMark />
            ))}
        </>
    );
};

const RigidModel = ({ object, node, position, rotation, scale }: {
    object: Object3D;
    node: SceneNode;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}) => {
    const [clone, setClone] = useState<Object3D | null>(null);

    useEffect(() => {
        setClone(cloneObject(object));
    }, [object]);

    if (!clone) return null;

    return (
        <RigidBody
            position={position || [0, 0, 0]}
            rotation={rotation}
            type={node.components?.find(c => c.type === 'physics')?.props?.type || 'dynamic'}
            colliders="trimesh"
        >
            <primitive scale={scale} object={clone} />
            {node.children?.map((child, index) => (
                <RecursiveNode
                    key={child.id || index}
                    node={child}
                    onSelect={() => { }}
                    selectedNodeId={null}
                    setSceneGraph={() => { }}
                    getNodeRef={() => ({ current: null })}
                    playMode={EditorModes.Play}
                />
            ))}
        </RigidBody>
    );
};

const ClonedModel = ({ object }: { object: Object3D }) => {
    const [clone, setClone] = useState<Object3D | null>(null);
    useEffect(() => { setClone(cloneObject(object)); }, [object]);
    return clone ? <primitive object={clone} /> : null;
};

const ExclamationMark = () => (
    <>
        <mesh position={[0, 0.4, 0]} scale={[0.1, 0.4, 0.1]}>
            <boxGeometry />
            <meshStandardMaterial color="red" />
        </mesh>
        <mesh position={[0, 0, 0]} scale={[0.1, 0.1, 0.1]}>
            <boxGeometry />
            <meshStandardMaterial color="red" />
        </mesh>
    </>
);
