import React from "react";
import { Group, Object3DEventMap } from "three";
import { Object3DNode } from "./Object3DNode";
import { ObjectTypes } from "./index";
import { RigidBody } from "@react-three/rapier";


export function DetailsView({ node, onUpdate }: { node: any; onUpdate: (updates: any) => void }) {
    const handleChange = (field: string, value: any) => {
        if (field === "name") {
            onUpdate({ name: value });
        } else {
            onUpdate({ props: { ...node.props, [field]: value } });
        }
    };
    const handleVec3Change = (field: string, idx: number, value: number) => {
        const arr = [...(node.props[field] as number[])];
        arr[idx] = value;
        onUpdate({ props: { ...node.props, [field]: arr } });
    };
    return (
        <div>
            <div>
                Name: <input value={node.name} onChange={e => handleChange('name', e.target.value)} style={{ fontFamily: 'monospace', width: 100 }} />
            </div>
            <div>
                Position:
                {[0, 1, 2].map(i => (
                    <input
                        key={i}
                        type="number"
                        value={node.props.position[i]}
                        step="0.1"
                        style={{ width: 50, marginLeft: 4 }}
                        onChange={e => handleVec3Change('position', i, parseFloat(e.target.value))}
                    />
                ))}
            </div>
            <div>
                Rotation:
                {[0, 1, 2].map(i => (
                    <input
                        key={i}
                        type="number"
                        value={node.props.rotation[i]}
                        step="0.1"
                        style={{ width: 50, marginLeft: 4 }}
                        onChange={e => handleVec3Change('rotation', i, parseFloat(e.target.value))}
                    />
                ))}
            </div>
            <div>
                Scale:
                {[0, 1, 2].map(i => (
                    <input
                        key={i}
                        type="number"
                        value={node.props.scale[i]}
                        step="0.1"
                        style={{ width: 50, marginLeft: 4 }}
                        onChange={e => handleVec3Change('scale', i, parseFloat(e.target.value))}
                    />
                ))}
            </div>
        </div>
    );
}

// Helper for shared onClick logic
export function getNodeMesh({ node, onSelect, isPlaying, geometry, material }: { node: any, onSelect: (node: any) => void, isPlaying?: boolean, geometry: React.ReactNode, material: React.ReactNode }) {
    return (
        <mesh
            {...(!isPlaying && {
                onClick: (e: any) => {
                    e.stopPropagation();
                    onSelect(node);
                }
            })}
        >
            {geometry}
            {material}
        </mesh>
    );
}

export function BaseNode({ node, onSelect, selectedId, setTransformTarget, isPlaying }: { node: any, onSelect: (node: any) => void, selectedId?: string, setTransformTarget: (obj: Group<Object3DEventMap> | null) => void, isPlaying?: boolean }) {
    const groupRef = selectedId === node.id
        ? (instance: Group<Object3DEventMap> | null) => setTransformTarget(instance)
        : undefined;

    const scale = node.props.scale ?? [1, 1, 1];
    const typeDef = ObjectTypes[node.type as keyof typeof ObjectTypes];

    // Get geometry/material for this type, or fallback
    let geometry: React.ReactNode = <sphereGeometry args={[0.1, 0.1, 0.1]} />;
    let material: React.ReactNode = <meshStandardMaterial color={node.props.material || "#4f8cff"} />;
    let extras: React.ReactNode = null;
    if (typeDef) {
        if (node.type === "object") {
            geometry = <boxGeometry args={[0.5, 0.5, 0.5]} />;
            material = <meshStandardMaterial color={node.props.material || "#4f8cff"} />;
        } else if (node.type === "spotlight") {
            geometry = <sphereGeometry args={[0.1, 16, 16]} />;
            material = <meshBasicMaterial color={node.props.color || "#ffffff"} />;
            extras = <spotLight color={node.props.color || "#ffffff"} intensity={node.props.intensity || 1} position={[0, 0, 0]} />;
        } else if (node.type === "orthographicCamera") {
            geometry = <boxGeometry args={[0.3, 0.2, 0.1]} />;
            material = <meshStandardMaterial color={node.props.material || "#4f8cff"} />;
        }
    }

    const rigidBodyComp = node.components?.find((c: any) => c.type === "RigidBody");

    const group = (
        <group ref={groupRef} name={node.name}>
            {extras}
            {getNodeMesh({
                node,
                onSelect,
                isPlaying,
                geometry,
                material
            })}
            {node.children.map((child: any) => (
                <Object3DNode key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} isPlaying={isPlaying} />
            ))}
        </group>
    );

    if (rigidBodyComp) {
        return (
            <RigidBody type={rigidBodyComp.data?.type || "fixed"} position={node.props.position} rotation={node.props.rotation} scale={scale}>
                {group}
            </RigidBody>
        );
    } else {
        return (
            <group ref={groupRef} name={node.name} position={node.props.position} rotation={node.props.rotation} scale={scale}>
                {extras}
                {getNodeMesh({
                    node,
                    onSelect,
                    isPlaying,
                    geometry,
                    material
                })}
                {node.children.map((child: any) => (
                    <Object3DNode key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} setTransformTarget={setTransformTarget} isPlaying={isPlaying} />
                ))}
            </group>
        );
    }
}
