import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import { Object3D, Object3DEventMap } from "three";
import { GameInstance } from "./InstanceProvider";

export enum EditorModes {
    Edit = "edit",
    Play = "play",
    Pause = "pause",
}

// recursive root for the scene graph
export default function Object3DNode({ node, onSelect, selectedNodeId, setSceneGraph, getNodeRef, playMode }: { node: SceneNode, onSelect: (id: string) => void, selectedNodeId: string | null, setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>, getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>, playMode: EditorModes }) {
    return (
        <RigidBodyWrapper node={node} onSelect={onSelect} selectedNodeId={selectedNodeId} setSceneGraph={setSceneGraph} getNodeRef={getNodeRef} playMode={playMode}>
            {node.children.map((child, index) => (
                <Object3DNode key={index} node={child} onSelect={onSelect} selectedNodeId={selectedNodeId} setSceneGraph={setSceneGraph} getNodeRef={getNodeRef} playMode={playMode} />
            ))}
        </RigidBodyWrapper>
    );
}
// --- Types ---
export type SceneNode = {
    id: string;
    name: string;
    children: SceneNode[];
    components: any[]; // New field for components
    transform?: {
        position: [number, number, number] | null;
        rotation: [number, number, number] | null;
        scale: number | null;
    } | null;
};


const ComponentMapper = ({ node }: { node: SceneNode }) => {
    const geometry = node.components?.find(c => c.type === 'boxGeometry');
    const material = node.components?.find(c => c.type === 'meshStandardMaterial');
    const model = node.components?.find(c => c.type === 'model');

    return <>
        {geometry ?
            <boxGeometry args={geometry.args || [0.1, 0.1, 0.1]} /> :
            <boxGeometry args={[0.1, 0.1, 0.1]} />
        }
        {material && <meshStandardMaterial {...material.props} />}
        {model && (model.object ? <>
            {/* <primitive object={model.object} /> */}
            <object3D />
            <GameInstance
                modelUrl={node.components.find(c => c.type === 'model')?.filename || ''}
                position={node.transform?.position || [0, 0, 0]}
                rotation={node.transform?.rotation || [0, 0, 0]}
            />
        </> : <ExclamationMark />)}
    </>
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

const RigidBodyWrapper = ({
    node,
    onSelect,
    selectedNodeId,
    children,
    setSceneGraph,
    getNodeRef,
    playMode
}: {
    node: SceneNode,
    onSelect: (id: string) => void,
    selectedNodeId: string | null,
    children?: React.ReactNode,
    setSceneGraph: React.Dispatch<React.SetStateAction<SceneNode[]>>,
    getNodeRef: (id: string) => React.RefObject<Object3D<Object3DEventMap> | null>,
    playMode: EditorModes
}) => {
    const ref = useRef<RapierRigidBody>(null);
    const groupRef = getNodeRef(node.id);
    const position = node.transform?.position?.map(v => v ?? 0) as [number, number, number] | undefined;
    const rotation = node.transform?.rotation?.map(v => v ?? 0) as [number, number, number] | undefined;
    const scale = node.transform?.scale ?? 1;

    const mesh = (
        <mesh
            onClick={e => {
                e.stopPropagation();
                onSelect(node.id);
            }}
            position={[0, 0, 0]}
            rotation={rotation ? [rotation[0], rotation[1], rotation[2]] : undefined}
            scale={scale}
        >
            <ComponentMapper node={node} />
            {children}
        </mesh>
    );

    if (playMode === EditorModes.Edit) {
        return (
            <group ref={groupRef} position={position || [0, 0, 0]} rotation={rotation} scale={scale}>
                {mesh}
            </group>
        );
    }

    return (
        <RigidBody
            ref={ref}
            colliders="hull"
            position={position || [0, 0, 0]}
            rotation={rotation ? [rotation[0], rotation[1], rotation[2]] : undefined}
            scale={scale}
        >
            <group ref={groupRef}>
                {mesh}
            </group>
        </RigidBody>
    );
};