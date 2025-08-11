import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Object3D, Object3DEventMap } from "three";
import { GameInstance, GameInstanceProvider } from "../editor/InstanceProvider";
import * as THREE from "three";
import { Html, OrbitControls, TransformControls } from "@react-three/drei";
import { useEditorContext } from "../editor/EditorContext";

export function Viewer() {
    const { sceneGraph, setSceneGraph, models, selectedNodeId, setSelectedNodeId, playMode } = useEditorContext();
    const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
    const transformDummyRef = useRef<THREE.Mesh>(null);
    const [isTransforming, setIsTransforming] = useState(false);

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

    // Find selected node (simple helper)
    function findNode(nodes: SceneNode[], id: string): SceneNode | null {
        for (const node of nodes) {
            if (node.id === id) return node;
            const found = findNode(node.children, id);
            if (found) return found;
        }
        return null;
    }

    // Update transform (simple helper)
    function updateTransform(nodes: SceneNode[], id: string, transform: any): SceneNode[] {
        return nodes.map(n => ({
            ...n,
            transform: n.id === id ? { ...n.transform, ...transform } : n.transform,
            children: updateTransform(n.children, id, transform)
        }));
    }

    const selectedNode = selectedNodeId ? findNode(sceneGraph, selectedNodeId) : null;

    // Simple sync: when selected node changes, update dummy position
    useEffect(() => {
        if (!selectedNode || !transformDummyRef.current) return;

        const dummy = transformDummyRef.current;
        const t = selectedNode.transform;

        dummy.position.set(...(t?.position || [0, 0, 0]));
        dummy.rotation.set(...(t?.rotation || [0, 0, 0]));
        dummy.scale.setScalar(t?.scale || 1);
    }, [selectedNode]);

    // Simple keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedNodeId || playMode !== EditorModes.Edit) return;
            if (e.key === 'g') setTransformMode('translate');
            if (e.key === 'r') setTransformMode('rotate');
            if (e.key === 's') setTransformMode('scale');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeId, playMode]);

    return <>
        <GameInstanceProvider models={models}>
            <RecursiveNode
                node={injectModels(sceneGraph, models)[0]}
                onSelect={(id) => {
                    if (!isTransforming) {
                        setSelectedNodeId(id);
                    }
                }}
                selectedNodeId={selectedNodeId}
                setSceneGraph={setSceneGraph}
                playMode={playMode}
            />
        </GameInstanceProvider>
        {playMode == EditorModes.Edit && <>
            <OrbitControls makeDefault />
            <gridHelper args={[10, 10, 10]} />

            {/* Dummy object for transform controls */}
            {selectedNodeId && (
                <mesh ref={transformDummyRef} visible={false}>
                    <boxGeometry args={[0.1, 0.1, 0.1]} />
                </mesh>
            )}

            {/* Transform controls */}
            {selectedNodeId && transformDummyRef.current && (
                <TransformControls
                    object={transformDummyRef.current}
                    mode={transformMode}
                    onMouseDown={() => setIsTransforming(true)}
                    onMouseUp={() => setIsTransforming(false)}
                    onObjectChange={() => {
                        if (!transformDummyRef.current || !selectedNodeId) return;

                        const dummy = transformDummyRef.current;
                        const updateData: any = {};

                        if (transformMode === 'translate') {
                            updateData.position = [dummy.position.x, dummy.position.y, dummy.position.z];
                        } else if (transformMode === 'rotate') {
                            updateData.rotation = [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z];
                        } else if (transformMode === 'scale') {
                            updateData.scale = dummy.scale.x;
                        }

                        setSceneGraph((prev: SceneNode[]) => updateTransform(prev, selectedNodeId, updateData));
                    }}
                />
            )}
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
export default function RecursiveNode({ node, onSelect, selectedNodeId, setSceneGraph, playMode }: { node: SceneNode, onSelect: (id: string) => void, selectedNodeId: string | null, setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>, playMode: EditorModes }) {
    return <PhysicsWrapper
        node={node}
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
            <ComponentMapper node={node} playMode={playMode} />
            {node.children?.map((child, index) => (
                <RecursiveNode key={index} node={child} onSelect={onSelect} selectedNodeId={selectedNodeId} setSceneGraph={setSceneGraph} playMode={playMode} />
            ))}
        </mesh>
    </PhysicsWrapper>
}

export function PhysicsWrapper({ node, playMode, children }: { node: SceneNode, playMode: EditorModes, children: React.ReactNode }) {
    const ref = useRef<RapierRigidBody>(null);
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
        <group position={position || [0, 0, 0]} rotation={rotation} scale={scale}>
            {children}
        </group>
    );
}

const ComponentMapper = ({ node, playMode }: { node: SceneNode, playMode?: EditorModes }) => {
    const geometry = node.components?.find(c => c.type === 'boxGeometry');
    const material = node.components?.find(c => c.type === 'meshStandardMaterial');
    const model = node.components?.find(c => c.type === 'model');

    // Don't render non-instanced models in play mode if they have physics
    // because PhysicsWrapper will handle rendering them with physics
    const hasPhysics = node.components?.some(c => c.type === 'physics');
    const shouldSkipModelRender = playMode === EditorModes.Play &&
        hasPhysics &&
        model &&
        !model.instanced &&
        node.name !== 'Root';

    return <>
        {<boxGeometry args={geometry?.args || [0, 0, 0]} />}
        {material && <meshStandardMaterial {...material.props} />}
        {model && !shouldSkipModelRender && (model.object ? <>
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
        const cloned = object?.clone?.();
        if (!cloned) return;
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
        const cloned = object?.clone?.();
        if (!cloned) return;
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
