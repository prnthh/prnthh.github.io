"use client";

import GameCanvas from "@/shared/GameCanvas";
import { TransformControls, useHelper } from "@react-three/drei";
import { useState } from "react";
import { BoxHelper, Mesh } from "three";
import { Prefab, GameObject as GameObjectType } from "./types";
import { ThreeEvent } from "@react-three/fiber";

export default function PrefabEditorPage() {
    return <div className="w-screen h-screen">
        <GameCanvas>
            <ambientLight intensity={1.5} />
            <gridHelper args={[10, 10]} position={[0, -1, 0]} />
            <PrefabEditor />
        </GameCanvas>
    </div>
}

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
                    position: [0, 0, 0],
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
        ],
    }
};

export function PrefabEditor() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [prefab] = useState<Prefab>(testPrefab);

    return <>
        <GameObjectRenderer
            gameObject={prefab.root}
            selectedId={selectedId}
            onSelect={setSelectedId}
        />
    </>
}

interface GameObjectRendererProps {
    gameObject: GameObjectType;
    selectedId: string | null;
    onSelect: (id: string) => void;
}

function GameObjectRenderer({ gameObject, selectedId, onSelect }: GameObjectRendererProps) {
    const [meshRef, setMeshRef] = useState<Mesh | null>(null);
    const transform = gameObject.components?.transform;
    const geometry = gameObject.components?.geometry;
    const material = gameObject.components?.material;
    const isSelected = selectedId === gameObject.id;

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(gameObject.id);
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
            default:
                return <boxGeometry args={[1, 1, 1]} />;
        }
    };

    // Render material based on component
    const renderMaterial = () => {
        if (!material) {
            return <meshStandardMaterial color="red" wireframe />;
        }

        const { color, wireframe = false } = material.properties;
        const displayColor = isSelected ? "cyan" : color;

        return <meshStandardMaterial color={displayColor} wireframe={wireframe} />;
    };

    return (
        <group>
            {(transform || geometry || material) && (
                <>
                    <mesh
                        ref={setMeshRef}
                        onClick={handleClick}
                        position={transform?.properties.position}
                        rotation={transform?.properties.rotation}
                        scale={transform?.properties.scale}
                    >
                        {renderGeometry()}
                        {renderMaterial()}
                    </mesh>

                    {meshRef && isSelected && <TransformTool meshRef={meshRef} />}
                </>
            )}

            {gameObject.children?.map((child) => (
                <GameObjectRenderer
                    key={child.id}
                    gameObject={child}
                    selectedId={selectedId}
                    onSelect={onSelect}
                />
            ))}
        </group>
    );
}

function TransformTool({ meshRef }: { meshRef: Mesh }) {
    // @ts-expect-error it works, fuck drei
    useHelper(meshRef, BoxHelper, "cyan");

    return <TransformControls object={meshRef} />;
}

function GameObject() {
    return null;
}


export function PrefabViewer() {
    return null;
}