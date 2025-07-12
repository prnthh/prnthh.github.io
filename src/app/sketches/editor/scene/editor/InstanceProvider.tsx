import React, { createContext, useContext, useMemo, useState } from "react";
import { Merged } from '@react-three/drei';
import * as THREE from 'three';


// --- Types ---
export type InstanceData = {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    meshPath: string;
};

// --- Context ---
const GameInstanceContext = createContext<{
    addInstance: (instance: InstanceData) => void;
    removeInstance: (instance: InstanceData) => void;
    instances: InstanceData[];
    meshes: Record<string, any>;
    instancesMap?: Record<string, any>;
} | null>(null);

// --- Provider ---
export function GameInstanceProvider({
    children,
    models
}: {
    children: React.ReactNode,
    models: { [filename: string]: any }
}) {
    const [instances, setInstances] = useState<InstanceData[]>([]);

    const addInstance = (instance: InstanceData) => {
        setInstances(prev => {
            // Replace if id exists, else add
            const idx = prev.findIndex(i => i.id === instance.id);
            if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = instance;
                return copy;
            }
            return [...prev, instance];
        });
    };

    const removeInstance = (instance: InstanceData) => {
        setInstances(prev => prev.filter(i => i.id !== instance.id));
    };

    // Unique mesh options from instances
    const meshOptions = useMemo(() => Array.from(
        new Map(
            instances.map(d => [d.meshPath, { name: d.meshPath, path: d.meshPath }])
        ).values()
    ), [instances]);

    // Use model objects from models prop instead of loading via useGLTF
    function getMeshesFromScene(root: THREE.Object3D, modelKey: string) {
        const meshes: Record<string, THREE.Mesh> = {};
        let meshIndex = 0;
        function collectMeshes(obj: THREE.Object3D) {
            if ((obj as unknown as THREE.Mesh).isMesh) {
                const key = `${modelKey}_${meshIndex}`;
                meshes[key] = obj as unknown as THREE.Mesh;
                meshIndex++;
            }
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(child => collectMeshes(child as unknown as THREE.Object3D));
            }
        }
        collectMeshes(root);
        return meshes;
    }

    // Merge meshes from all loaded models (from models prop)
    const meshes = useMemo(() => (
        Object.assign(
            {},
            ...meshOptions.map(opt => {
                const model = models[opt.name];
                if (!model) { console.log("not found", opt.name); return {} };
                // Try .scene, fallback to model itself
                const root = model.scene ?? model;
                return getMeshesFromScene(root as unknown as THREE.Object3D, opt.name);
            })
        )
    ), [meshOptions, models]);

    return (
        <Merged meshes={meshes} castShadow receiveShadow>
            {(instancesMap) => (
                <GameInstanceContext.Provider value={{ addInstance, removeInstance, instances, meshes, instancesMap }}>
                    {children}
                </GameInstanceContext.Provider>
            )}
        </Merged>
    );
}

// --- GameInstance ---
export function GameInstance({
    modelUrl,
    position,
    rotation,
    children
}: {
    modelUrl: string;
    position: [number, number, number];
    rotation: [number, number, number];
    children?: React.ReactNode;
}) {
    const ctx = useContext(GameInstanceContext);

    // Stable id for this instance
    const idRef = React.useRef<string>(Math.random().toString(36).substr(2, 9));

    // Add/remove instance to context for meshOptions/meshes calculation
    React.useEffect(() => {
        if (!ctx) return;

        const instance: InstanceData = {
            id: idRef.current,
            meshPath: modelUrl,
            position,
            rotation
        };

        ctx.addInstance(instance);

        return () => {
            ctx.removeInstance(instance);
        };
    }, [modelUrl, position, rotation]);

    // Render mesh instance(s) for this GameInstance
    // Use instancesMap from context
    if (!ctx || !ctx.instancesMap) return null;
    const meshNames = Object.keys(ctx.instancesMap);
    const meshNamesToUse = meshNames.filter((n) =>
        typeof n === 'string' && modelUrl && n.includes(modelUrl)
    );
    // Do NOT pass position/rotation to <Instance />; <Merged> handles transforms internally.
    return (
        <>
            {meshNamesToUse.map((name) => {
                const Instance = ctx.instancesMap![name];
                return (
                    <Instance
                        key={name}
                        scale={[1, 1, 1]}
                    >
                        {children}
                    </Instance>
                );
            })}
        </>
    );
}