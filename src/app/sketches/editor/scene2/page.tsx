"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef, memo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { create } from "zustand";
import * as THREE from "three";
import {
    EntityId,
    Entity,
    System,
    Object3DComponent,
    createEntity,
    ECSStoreType,
} from "./ecs";
import { Physics } from "@react-three/rapier";
import SceneHierarchy from "./ui/SceneHierarchy";
import useECSStore, { ECS_COMPONENTS, ECS_SYSTEMS } from "./EditorContext";
import EntityDetails from "./ui/EntityDetails";

// Entity Component
const EntityView = forwardRef<THREE.Object3D, { entity: Entity }>(({ entity }, ref) => {
    const meshRef = useRef<THREE.Object3D>(null);
    const { selectedEntity, setSelectedEntity, updateComponent } = useECSStore() as ECSStoreType;
    const obj3d = entity.components.get("Object3D") as Object3DComponent;
    const mesh = entity.components.get("mesh");
    // Forward meshRef to parent
    useImperativeHandle(ref, () => meshRef.current!, []);
    // Save mesh ref to ECS store on mount
    useEffect(() => {
        if (meshRef.current) {
            updateComponent(entity.id, "Object3D", { meshRef: meshRef });
        }
    }, [entity.id, updateComponent]);
    // Sync mesh transform with Object3D every frame
    useFrame(() => {
        if (meshRef.current && obj3d && obj3d.object3D) {
            meshRef.current.position.copy(obj3d.object3D.position);
            meshRef.current.rotation.copy(obj3d.object3D.rotation);
            meshRef.current.scale.copy(obj3d.object3D.scale);
        }
    });
    return (
        <group
            ref={meshRef}
            scale={obj3d?.object3D?.scale?.toArray?.() || [1, 1, 1]}
            onClick={(e) => {
                setSelectedEntity(entity.id);
                e.stopPropagation();
            }}
        >
            {[...entity.components.entries()].map(([name, props]) => {
                const Comp = ECS_COMPONENTS[name];
                return Comp ? <Comp key={name} {...props} /> : null;
            })}
            {mesh && (
                <mesh>
                    {mesh.geometry === "box" && <boxGeometry args={[1, 1, 1]} />}
                    {mesh.geometry === "sphere" && <sphereGeometry args={[1, 32, 32]} />}
                    <meshStandardMaterial color={selectedEntity === entity.id ? "red" : (mesh.color || "orange")} />
                </mesh>
            )}
        </group>
    );
});

// System Runner
function ECSSystemRunner() {
    const { entities, systems } = useECSStore() as ECSStoreType;
    useFrame((state: any, delta: number) => {
        systems.forEach((system: System) => system(entities, delta));
    });
    return null;
}

// Main App
function App() {
    const { entities, addEntity, addSystem, selectedEntity } = useECSStore() as ECSStoreType;
    useEffect(() => {
        addSystem(ECS_SYSTEMS.orbitSystem);
        addSystem(ECS_SYSTEMS.wanderSystem);
        // Add Sun (id: 1)
        addEntity(1, {
            mesh: { geometry: "sphere", color: "yellow" },
            OrbitComponent: { parentId: null, radius: 0, speed: 0, angle: 0 },
        });
        // Add Earth (id: 2)
        addEntity(2, {
            mesh: { geometry: "sphere", color: "blue" },
            OrbitComponent: { parentId: 1, radius: 5, speed: 0.5, angle: 0 },
        });
        // Add Moon (id: 3)
        addEntity(3, {
            mesh: { geometry: "sphere", color: "gray" },
            OrbitComponent: { parentId: 2, radius: 1.5, speed: 2, angle: 0 },
        });
        // Add Ground entity (id: 100)
        addEntity(100, {
            Ground: { position: [0, 0, 0] },
        });
        // Add Ped entity (id: 10)
        addEntity(10, {
            Ped: {
                modelUrl: "rigga/rigga2.glb",
                position: [5, 2, 0],
                offset: [0, -0.5, 0],
                wanderNodes: [
                    [5, 2, 0],
                    [0, 2, 0],
                    [-5, 2, 0],
                    [0, 2, 5],
                    [0, 2, -5],
                ],
            },
        });
        // Add SpotLight entity (id: 200)
        addEntity(200, {
            SpotLight: {
                position: [4, 4, 4],
                color: "white",
                intensity: 100,
                angle: Math.PI / 4,
                penumbra: 0.1,
                castShadow: true,
            },
        });
    }, [addEntity, addSystem]);
    const handleCanvasClick = (e: any) => {
        // Only clear selection if click was directly on the canvas (not a child)
        if (e.target === e.currentTarget) {
            (useECSStore.getState() as ECSStoreType).setSelectedEntity(null);
        }
    };

    // Get meshRef of selected entity
    let selectedMeshRef: React.RefObject<THREE.Object3D> | null = null;
    if (selectedEntity && entities.has(selectedEntity)) {
        const ent = entities.get(selectedEntity);
        const obj3d = ent?.components.get("Object3D");
        selectedMeshRef = obj3d?.meshRef ?? null;
    }

    useEffect(() => {
        if (selectedMeshRef?.current) {
            console.log('Selected meshRef:', selectedMeshRef.current);
        }
    }, [selectedEntity, selectedMeshRef]);

    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            <Canvas shadows onClick={handleCanvasClick} camera={{ position: [0, 10, 20], fov: 50 }}>
                <Physics>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 0, 0]} intensity={2} />
                    <OrbitControls makeDefault />

                    <ECSSystemRunner />
                    {[...entities.values()].map((entity) => (
                        <EntityView key={entity.id} entity={entity} />
                    ))}
                </Physics>
            </Canvas>
            <div className="fixed top-2 right-2 p-2 z-10">
                <SceneHierarchy />
                <EntityDetails />
            </div>
        </div>
    );
}

export default App;