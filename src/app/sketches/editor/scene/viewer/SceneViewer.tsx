import { CuboidCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Object3D, Object3DEventMap } from "three";
import { GameInstance, GameInstanceProvider } from "../editor/InstanceProvider";
import * as THREE from "three";
import { useEditorContext } from "../page";
import { Html, OrbitControls, TransformControls } from "@react-three/drei";

export function Viewer() {
    const { sceneGraph, setSceneGraph, models, selectedNodeId, setSelectedNodeId, getNodeRef, playMode } = useEditorContext();

    function injectModels(nodes: SceneNode[], models: { [filename: string]: any }): SceneNode[] {
        return nodes.map(node => {
            const newComponents = node.components?.map((comp: any) => {
                if (comp.type === 'model' && typeof comp.filename === 'string') {
                    return { ...comp, object: models[comp.filename] };
                }
                return comp;
            }) ?? [];
            return {
                ...node,
                components: newComponents,
                children: injectModels(node.children, models)
            };
        });
    }

    // Helper to update node transform by id recursively
    function updateNodeTransform(nodes: SceneNode[], id: string, transform: any): SceneNode[] {
        return nodes.map(n => {
            if (n.id === id) {
                return { ...n, transform: { ...n.transform, ...transform } };
            }
            return { ...n, children: updateNodeTransform(n.children, id, transform) };
        });
    }

    const selectedRef = selectedNodeId ? getNodeRef(selectedNodeId) : undefined;

    // Helper to check if a node exists in the scene graph
    function nodeExists(nodes: SceneNode[], id: string | null): boolean {
        if (!id) return false;
        for (const node of nodes) {
            if (node.id === id) return true;
            if (nodeExists(node.children, id)) return true;
        }
        return false;
    }

    // Clear selectedNodeId if the node is deleted
    useEffect(() => {
        if (selectedNodeId && !nodeExists(sceneGraph, selectedNodeId)) {
            setSelectedNodeId(null);
        }
    }, [sceneGraph, selectedNodeId]);

    return <>
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
        {playMode == EditorModes.Edit && <>
            <OrbitControls makeDefault />
            <gridHelper args={[10, 10, 10]} />
            {/* Top-level TransformControls overlay */}
            {(selectedNodeId && selectedRef && selectedRef.current && nodeExists(sceneGraph, selectedNodeId)) ? (
                <TransformControls
                    object={selectedRef.current}
                    mode="translate"
                    onObjectChange={() => {
                        const obj = selectedRef.current;
                        if (!obj) return;
                        setSceneGraph(prev => updateNodeTransform(prev, selectedNodeId, {
                            position: [obj.position.x, obj.position.y, obj.position.z],
                            // rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                            // scale: obj.scale.x // assuming uniform scale
                        }));
                    }}
                />
            ) : null}
        </>}
    </>
}

export enum EditorModes {
    Edit = "edit",
    Play = "play",
    Pause = "pause",
}

// --- Types ---
export type SceneNode = {
    id: string;
    name: string;
    children: SceneNode[];
    components: any[]; // New field for components
    transform?: {
        position?: [number, number, number] | null;
        rotation?: [number, number, number] | null;
        scale?: number | null;
    } | null;
};

// recursive root for the scene graph
export default function RecursiveNode({ node, onSelect, selectedNodeId, setSceneGraph, getNodeRef, playMode }: { node: SceneNode, onSelect: (id: string) => void, selectedNodeId: string | null, setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>, getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>, playMode: EditorModes }) {
    return <PhysicsWrapper
        node={node}
        getNodeRef={getNodeRef}
        playMode={playMode}
    >
        <mesh
            onClick={e => {
                e.stopPropagation();
                onSelect(node.id);
            }}
            castShadow
            receiveShadow
        >
            <ComponentMapper node={node} />
            {node.children?.map((child, index) => (
                <RecursiveNode key={index} node={child} onSelect={onSelect} selectedNodeId={selectedNodeId} setSceneGraph={setSceneGraph} getNodeRef={getNodeRef} playMode={playMode} />
            ))}
        </mesh>
    </PhysicsWrapper>
}

export function PhysicsWrapper({ node, getNodeRef, playMode, children }: { node: SceneNode, getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>, playMode: EditorModes, children: React.ReactNode }) {
    const ref = useRef<RapierRigidBody>(null);
    const groupRef = getNodeRef(node.id);
    const position = node.transform?.position?.map(v => v ?? 0) as [number, number, number] | undefined;
    const rotation = node.transform?.rotation?.map(v => v ?? 0) as [number, number, number] | undefined;
    const scale = node.transform?.scale ?? 1;
    const model = node.components?.find(c => c.type === 'model');


    if (
        playMode === EditorModes.Play &&
        node.components.some(c => c.type === 'physics') &&
        node.name !== 'Root' &&
        !(model?.instanced) // instanced models handle physics during instance creation
    ) {

        if (model)
            return <RigidClonedModel
                object={model.object}
                node={node}
                position={position}
                rotation={rotation}
                scale={scale}
            >{children}</RigidClonedModel>;

        return (
            <RigidBody
                ref={ref}
                colliders="hull"
                position={position || [0, 0, 0]}
                rotation={rotation}
                scale={scale}
                type={node.components.find(c => c.type === 'physics')?.props?.type || 'dynamic'}
            >
                <group>
                    {children}
                </group>
            </RigidBody>
        );
    }

    return (
        <group ref={groupRef} position={position || [0, 0, 0]} rotation={rotation} scale={scale}>
            {children}
        </group>
    );
}

const ComponentMapper = ({ node }: { node: SceneNode }) => {
    const geometry = node.components?.find(c => c.type === 'boxGeometry');
    const material = node.components?.find(c => c.type === 'meshStandardMaterial');
    const model = node.components?.find(c => c.type === 'model');

    return <>
        {<boxGeometry args={geometry?.args || [0, 0, 0]} />}
        {material && <meshStandardMaterial {...material.props} />}
        {model && (model.object ? <>
            {model.instanced ? <GameInstance
                modelUrl={node.components.find(c => c.type === 'model')?.filename || ''}
                position={node.transform?.position || [0, 0, 0]}
                rotation={node.transform?.rotation || [0, 0, 0]}
                physics={node.components.find(c => c.type === 'physics')}
            /> : <ClonedModel object={model.object} />
            }
        </> : <ExclamationMark />)}
    </>
}

const RigidClonedModel = ({ object, node, position, rotation, scale, children }: { object: Object3D, node: SceneNode, position?: [number, number, number], rotation?: [number, number, number], scale?: number, children?: React.ReactNode }) => {
    const [clone, setClone] = useState<Object3D>();
    useEffect(() => {
        const cloned = object.clone();
        cloned.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        setClone(cloned);
    }, [object]);

    return clone && <RigidBody
        // ref={ref}
        position={position || [0, 0, 0]}
        rotation={rotation}
        type={node.components.find(c => c.type === 'physics')?.props?.type || 'dynamic'}
        colliders="trimesh"
    >
        <primitive scale={scale} object={clone} />
        {children}
    </RigidBody>;
}

const ClonedModel = ({ object }: { object: Object3D }) => {
    const [clone, setClone] = useState<Object3D>();
    useEffect(() => {
        const cloned = object.clone();
        cloned.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        setClone(cloned);
    }, [object]);

    return clone && <primitive object={clone} />;
}

const ExclamationMark = () => {
    return <>
        <mesh position={[0, 0.4, 0]} scale={[0.1, 0.4, 0.1]}>
            <boxGeometry />
            <meshStandardMaterial color="red" />
        </mesh>
        <mesh position={[0, 0, 0]} scale={[0.1, 0.1, 0.1]}>
            <boxGeometry />
            <meshStandardMaterial color="red" />
        </mesh>
    </>
}
