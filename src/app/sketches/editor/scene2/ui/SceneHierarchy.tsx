import React, { useState, useMemo } from "react";
import { EntityId, Entity } from "../ecs";
import useECSStore from "../EditorContext";
import * as THREE from "three";

// Utility: Build a tree from flat ECS entities using OrbitComponent.parentId
function buildEntityTree(entities: Map<EntityId, Entity>) {
    const nodes: Record<EntityId, any> = {};
    const roots: any[] = [];
    entities.forEach((entity, id) => {
        nodes[id] = { ...entity, id, children: [] };
    });
    entities.forEach((entity, id) => {
        const orbit = entity.components.get("OrbitComponent");
        const parentId = orbit?.parentId ?? null;
        if (parentId !== null && nodes[parentId]) {
            nodes[parentId].children.push(nodes[id]);
        } else {
            roots.push(nodes[id]);
        }
    });
    return roots;
}

function SceneHierarchy() {
    const {
        entities,
        selectedEntity,
        setSelectedEntity,
        addEntity,
        updateComponent,
    } = useECSStore(); // entities is always from zustand store
    const [draggedId, setDraggedId] = useState<EntityId | null>(null);
    // Memoize tree to avoid unnecessary recalculations
    const tree = useMemo(() => buildEntityTree(entities), [entities]);

    // Add new entity as child
    const handleAddChild = (parentId: EntityId) => {
        const newId = Math.floor(Math.random() * 1000000);
        addEntity(newId, {
            Object3D: new THREE.Object3D(),
            mesh: { geometry: "box", color: "orange" },
            OrbitComponent: { parentId, radius: 2, speed: 0, angle: 0 },
        });
    };

    // Drag-and-drop reparenting
    const handleDrop = (targetId: EntityId) => {
        if (draggedId && draggedId !== targetId) {
            updateComponent(draggedId, "OrbitComponent", { parentId: targetId });
        }
        setDraggedId(null);
    };

    // Recursive tree render
    const renderNode = (node: any) => (
        <div
            key={node.id}
            style={{
                marginLeft: 16,
                border: selectedEntity === node.id ? "1px solid #4f8cff" : undefined,
                background: selectedEntity === node.id ? "#e6f0ff" : undefined,
                padding: 2,
                cursor: "pointer",
            }}
            draggable
            onDragStart={e => {
                e.stopPropagation();
                setDraggedId(node.id);
            }}
            onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                handleDrop(node.id);
            }}
            onDragOver={e => e.preventDefault()}
            onClick={e => {
                e.stopPropagation();
                setSelectedEntity(node.id);
            }}
        >
            Entity {node.id}
            <button style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); handleAddChild(node.id); }}>+</button>
            {node.children.map(renderNode)}
        </div>
    );

    return (
        <div className="w-[300px] bg-slate-800/20 rounded p-1 z-20">
            <h2>Scene Hierarchy</h2>
            {tree.map(renderNode)}
        </div>
    );
}

export default SceneHierarchy;
