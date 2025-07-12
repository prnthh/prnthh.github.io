import React, { createContext, useContext, useMemo, useState } from "react";
import { Bvh, Merged } from '@react-three/drei';
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
        <GameInstanceContext.Provider value={{ addInstance, removeInstance, instances }}>
            <Merged meshes={meshes} castShadow receiveShadow>
                {(instancesMap) => (
                    <>
                        <InstanceView data={instances} instancesMap={instancesMap} />
                        {children}
                    </>
                )}
            </Merged>
        </GameInstanceContext.Provider>
    );
}

// --- InstanceView ---
function InstanceView({ data, instancesMap }: { data: InstanceData[], instancesMap: Record<string, any> }) {
    const meshNames = Object.keys(instancesMap);

    return (
        <>
            {data.map((props, i) => {
                const meshPath = props.meshPath;
                const meshNamesToUse = meshNames.filter((n) =>
                    typeof n === 'string' && meshPath && n.includes(meshPath)
                );
                return (
                    <group key={meshPath + '-' + i} position={props.position} rotation={props.rotation}>
                        {meshNamesToUse.map((name) => {
                            const Instance = instancesMap[name];
                            return (
                                <Instance
                                    key={name}
                                    scale={[1, 1, 1]}
                                />
                            );
                        })}
                    </group>
                );
            })}
        </>
    );
}

// --- GameInstance ---
export function GameInstance({
    modelUrl,
    position,
    rotation
}: {
    modelUrl: string;
    position: [number, number, number];
    rotation: [number, number, number];
}) {
    const ctx = useContext(GameInstanceContext);

    // Stable id for this instance
    const idRef = React.useRef<string>(Math.random().toString(36).substr(2, 9));

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

    return null;
}