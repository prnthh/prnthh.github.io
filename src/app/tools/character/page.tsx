"use client";

import { GameCanvas } from "react-three-game";
import { Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useState } from "react";
import { Physics } from "@react-three/rapier";
import Mouth from "./Mouth";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import RigidHumanoidModel from "@/app/react-three-controller/ped/physics/RigidHumanoidModel";
import { AnimationClip, Object3D, Vector3 } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { DebugGroundVisual } from "@/shared/ground/DebugGround";
import { SkeletonUtils } from "three-stdlib";

const animationList = ["idle", "walk"] as const;

const animationOverrides = {
    idle: "/models/human/anim/idle.fbx",
    walk: "/models/human/anim/walk.fbx",
};

type LoadedAnimationItem = {
    name: string;
    source: "model" | "override";
    path?: string;
};

type FocusedModelAsset = {
    modelUrl: string;
    scene: Object3D;
    exportClips: AnimationClip[];
    loadedAnimations: LoadedAnimationItem[];
};

const gltfAssetCache = new Map<string, Promise<{ scene: Object3D; animations: AnimationClip[] }>>();
const fbxClipCache = new Map<string, Promise<AnimationClip | null>>();

function stripNeckTracks(clip: AnimationClip) {
    const filteredClip = clip.clone();
    filteredClip.tracks = clip.tracks.filter((track) => !track.name.includes("mixamorigNeck"));
    return filteredClip;
}

function loadModelAsset(modelUrl: string) {
    const cached = gltfAssetCache.get(modelUrl);
    if (cached) {
        return cached;
    }

    const request = new Promise<{ scene: Object3D; animations: AnimationClip[] }>((resolve, reject) => {
        new GLTFLoader().load(
            modelUrl,
            (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations ?? [] }),
            undefined,
            reject,
        );
    });

    gltfAssetCache.set(modelUrl, request);
    return request;
}

function loadAnimationClip(animationUrl: string) {
    const cached = fbxClipCache.get(animationUrl);
    if (cached) {
        return cached;
    }

    const request = new Promise<AnimationClip | null>((resolve, reject) => {
        new FBXLoader().load(
            animationUrl,
            (fbx) => resolve(fbx.animations[0] ? stripNeckTracks(fbx.animations[0]) : null),
            undefined,
            reject,
        );
    });

    fbxClipCache.set(animationUrl, request);
    return request;
}

function getDownloadName(modelUrl: string) {
    const fileName = modelUrl.split("/").pop() ?? "character.glb";
    return `${fileName.replace(/\.glb$/i, "")}-with-animations.glb`;
}

async function exportPackedGlb(scene: Object3D, animations: AnimationClip[]) {
    const exporter = new GLTFExporter();
    const exportScene = SkeletonUtils.clone(scene);

    return new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
            exportScene,
            (result) => {
                if (result instanceof ArrayBuffer) {
                    resolve(result);
                    return;
                }

                reject(new Error("Expected binary GLB export output."));
            },
            (error) => reject(error instanceof Error ? error : new Error("Failed to export GLB.")),
            {
                binary: true,
                animations: animations.map((clip) => clip.clone()),
            },
        );
    });
}

type AnimationRequest = {
    id: number;
    targetModelIndex: number;
};

function ControlledAnimatedModel({
    modelIndex,
    model,
    position,
    modelOffset,
    animationRequest,
    height,
    scale,
    showCollider,
}: {
    modelIndex: number;
    model: string;
    position: [number, number, number];
    modelOffset: [number, number, number];
    animationRequest: AnimationRequest;
    height: number;
    scale: number;
    showCollider: boolean;
}) {
    const [animationIndex, setAnimationIndex] = useState(0);

    useEffect(() => {
        if (animationRequest.id === 0 || animationRequest.targetModelIndex !== modelIndex) return;

        setAnimationIndex((prev) => (prev + 1) % animationList.length);
    }, [animationRequest, modelIndex]);

    const animation = animationList[animationIndex];

    if (showCollider) {
        return (
            <RigidHumanoidModel
                position={position}
                modelOffset={modelOffset}
                model={model}
                animation={animation}
                animationOverrides={animationOverrides}
                height={height}
                scale={scale}
            >
                <Mouth />
            </RigidHumanoidModel>
        );
    }

    return (
        <group position={position} rotation={[0, 0, 0]}>
            <AnimatedModel
                model={model}
                modelOffset={modelOffset}
                animation={animation}
                animationOverrides={animationOverrides}
                height={height}
                scale={scale}
            >
                <Mouth />
            </AnimatedModel>
        </group>
    );
}

export default function CharacterPage() {
    const [focusedModelIndex, setFocusedModelIndex] = useState(0);
    const [animationRequest, setAnimationRequest] = useState<AnimationRequest>({ id: 0, targetModelIndex: 0 });
    const [focusedHeight, setFocusedHeight] = useState(1);
    const [focusedScale, setFocusedScale] = useState(1);
    const [focusedYOffset, setFocusedYOffset] = useState(0);
    const [showCollider, setShowCollider] = useState(true);
    const [focusedModelAsset, setFocusedModelAsset] = useState<FocusedModelAsset | null>(null);
    const [isLoadingAnimations, setIsLoadingAnimations] = useState(false);
    const [animationLoadError, setAnimationLoadError] = useState<string | null>(null);
    const [isExportingGlb, setIsExportingGlb] = useState(false);
    const allModels = [
        "/models/human/onimilio/rigged.glb",
        "/models/human/oni2/character.glb",
        "/models/human/rigga/rigga.glb",
        "/models/human/rigga/rigga2.glb",
        "/models/human/rigga/rigga3.glb",
        "/models/human/rigga/rigga4.glb",
        "/models/human/rigga/rigga5.glb",
        "/models/human/rigga/rigga6.glb",
        "/models/human/milady.glb",
        // "/models/human/barney_hd.glb",
        "/models/human/Soldier.glb",
        "/models/human/xbot.glb",
        "/models/human/ybot.glb",
    ];
    const focusedModelUrl = allModels[focusedModelIndex];

    useEffect(() => {
        let disposed = false;

        setIsLoadingAnimations(true);
        setAnimationLoadError(null);

        void (async () => {
            try {
                const modelAsset = await loadModelAsset(focusedModelUrl);
                const overrideEntries = await Promise.all(
                    Object.entries(animationOverrides).map(async ([name, path]) => ({
                        name,
                        path,
                        clip: await loadAnimationClip(path),
                    })),
                );

                if (disposed) {
                    return;
                }

                const seenNames = new Set<string>();
                const loadedAnimations: LoadedAnimationItem[] = [];
                const exportClips: AnimationClip[] = [];

                for (const clip of modelAsset.animations) {
                    const clipName = clip.name.trim();
                    const normalizedName = clipName.toLowerCase();
                    if (!clipName || seenNames.has(normalizedName)) {
                        continue;
                    }

                    seenNames.add(normalizedName);
                    loadedAnimations.push({ name: clipName, source: "model" });
                    exportClips.push(stripNeckTracks(clip));
                }

                for (const entry of overrideEntries) {
                    if (!entry.clip || seenNames.has(entry.name.toLowerCase())) {
                        continue;
                    }

                    const clip = entry.clip.clone();
                    clip.name = entry.name;
                    seenNames.add(entry.name.toLowerCase());
                    loadedAnimations.push({ name: entry.name, source: "override", path: entry.path });
                    exportClips.push(clip);
                }

                setFocusedModelAsset({
                    modelUrl: focusedModelUrl,
                    scene: modelAsset.scene,
                    exportClips,
                    loadedAnimations,
                });
            } catch (error) {
                if (disposed) {
                    return;
                }

                setFocusedModelAsset(null);
                setAnimationLoadError(error instanceof Error ? error.message : "Failed to load animations.");
            } finally {
                if (!disposed) {
                    setIsLoadingAnimations(false);
                }
            }
        })();

        return () => {
            disposed = true;
        };
    }, [focusedModelUrl]);

    async function downloadPackedGlb() {
        if (!focusedModelAsset) {
            return;
        }

        setIsExportingGlb(true);
        setAnimationLoadError(null);

        try {
            const glbData = await exportPackedGlb(focusedModelAsset.scene, focusedModelAsset.exportClips);
            const blob = new Blob([glbData], { type: "model/gltf-binary" });
            const blobUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = blobUrl;
            anchor.download = getDownloadName(focusedModelAsset.modelUrl);
            anchor.click();
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            setAnimationLoadError(error instanceof Error ? error.message : "Failed to export GLB.");
        } finally {
            setIsExportingGlb(false);
        }
    }

    return <div className="w-screen h-screen">
        <GameCanvas camera={{ position: [0, 1.5, 3], }}>
            <Physics debug={showCollider} gravity={[0, 0, 0]}>
                {allModels.map((modelUrl, index) => {
                    const isFocused = index === focusedModelIndex;

                    return (
                        <ControlledAnimatedModel
                            key={modelUrl}
                            modelIndex={index}
                            model={modelUrl}
                            position={[index * 2 - focusedModelIndex * 2, 0, 0]}
                            modelOffset={[0, isFocused ? focusedYOffset : 0, 0]}
                            animationRequest={animationRequest}
                            height={isFocused ? focusedHeight : 1}
                            scale={isFocused ? focusedScale : 1}
                            showCollider={isFocused && showCollider}
                        />
                    );
                })}
            </Physics>

            <ambientLight intensity={2} />
            <DebugGroundVisual />
            <OrbitControls target={new Vector3(0, 0.5, 0)} makeDefault enablePan={false} />

            <Environment background frames={1}>
                <mesh>
                    <sphereGeometry args={[50, 64, 64]} />
                    <meshBasicMaterial
                        color="#87CEEB"
                        side={2}
                        depthWrite={false}
                        fog={false}
                    />
                </mesh>
            </Environment>
        </GameCanvas>
        <div className="absolute top-8 right-8 flex w-64 flex-col gap-3 rounded bg-black/50 p-4 text-white">

            <div className="flex justify-between">
                <button onClick={() => setFocusedModelIndex((prev) => (prev - 1 + allModels.length) % allModels.length)}>&lt;--</button>
                <button onClick={() => setFocusedModelIndex((prev) => (prev + 1) % allModels.length)}>--&gt;</button>
            </div>
            {allModels[focusedModelIndex]}

            <label className="flex flex-col gap-1 text-sm">
                <span>Focused Height: {focusedHeight.toFixed(2)}</span>
                <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.01"
                    value={focusedHeight}
                    onChange={(event) => setFocusedHeight(Number(event.target.value))}
                />
            </label>
            <label className="flex flex-col gap-1 text-sm">
                <span>Focused Scale: {focusedScale.toFixed(2)}</span>
                <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.01"
                    value={focusedScale}
                    onChange={(event) => setFocusedScale(Number(event.target.value))}
                />
            </label>
            <label className="flex flex-col gap-1 text-sm">
                <span>Focused Y Offset: {focusedYOffset.toFixed(2)}</span>
                <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.01"
                    value={focusedYOffset}
                    onChange={(event) => setFocusedYOffset(Number(event.target.value))}
                />
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={showCollider}
                    onChange={(event) => setShowCollider(event.target.checked)}
                />
                <span>Show Focused Collider</span>
            </label>
            <button>add instance</button>
            <button onClick={() => setAnimationRequest((prev) => ({
                id: prev.id + 1,
                targetModelIndex: focusedModelIndex,
            }))}>
                next animation
            </button>
            <button
                onClick={() => void downloadPackedGlb()}
                disabled={!focusedModelAsset || isLoadingAnimations || isExportingGlb}
                className="disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isExportingGlb ? "packing glb..." : "download glb with animations"}
            </button>
            <div className="flex flex-col gap-2 text-sm">
                <div className="font-medium">Loaded animations</div>
                {isLoadingAnimations && <div className="text-white/70">loading...</div>}
                {!isLoadingAnimations && animationLoadError && <div className="text-red-300">{animationLoadError}</div>}
                {!isLoadingAnimations && !animationLoadError && focusedModelAsset?.loadedAnimations.length === 0 && (
                    <div className="text-white/70">No animations found.</div>
                )}
                {!isLoadingAnimations && !animationLoadError && focusedModelAsset?.loadedAnimations.map((clip) => (
                    <div key={`${clip.source}-${clip.name}`} className="break-all text-white/90">
                        {clip.name} <span className="text-white/50">({clip.source})</span>
                    </div>
                ))}
            </div>

        </div>
    </div>
}
