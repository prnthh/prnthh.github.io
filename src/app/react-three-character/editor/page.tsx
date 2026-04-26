"use client";

import { GameCanvas } from "react-three-game";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import Mouth from "./Mouth";
import AnimatedModel from "@/app/react-three-character/HumanoidModel";
import type { AnimationClip, Object3D } from "three";
import { DoubleSide, Plane, Vector3 } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { DebugGroundVisual } from "@/shared/ground/DebugGround";
import { SkeletonUtils } from "three-stdlib";
import BoneAttachment from "../BoneAttachment";
import SimpleModel from "@/shared/SimpleModel";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const animationList = ["idle", "walk"] as const;

const animationOverrides = {
    idle: "/models/human/anim/idle.fbx",
    walk: "/models/human/anim/walk.fbx",
};

const ALL_MODELS = [
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

const CHARACTERS_PER_RING = 6;
const CHARACTER_RING_RADIUS = 4.5;
const CHARACTER_RING_HEIGHT = 3;
const FLOOR_DISC_RADIUS = CHARACTER_RING_RADIUS + 1.8;
const FLOOR_DISC_INNER_RADIUS = CHARACTER_RING_RADIUS - 1.1;
const FLOOR_DISC_THICKNESS = 0.3;
const ENABLE_MOUSE_LOOK = true;

function CharacterTowerBackdrop({ floorCount }: { floorCount: number }) {
    const wallHeight = Math.max(CHARACTER_RING_HEIGHT * floorCount + 2, 6);

    return (
        <group>
            <mesh position={[0, wallHeight / 2 - 1, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[FLOOR_DISC_RADIUS, FLOOR_DISC_RADIUS, wallHeight, 48, 1, true]} />
                <meshStandardMaterial color="#8f8578" roughness={0.95} metalness={0.05} side={DoubleSide} />
            </mesh>

            {Array.from({ length: floorCount }, (_, floorIndex) => {
                const floorY = floorIndex * CHARACTER_RING_HEIGHT - FLOOR_DISC_THICKNESS;

                return (
                    <mesh key={`floor-${floorY}`} position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
                        <ringGeometry args={[FLOOR_DISC_INNER_RADIUS, FLOOR_DISC_RADIUS, 48, 1]} />
                        <meshStandardMaterial color="#a2998c" roughness={0.97} metalness={0.03} side={DoubleSide} />
                    </mesh>
                );
            })}
        </group>
    );
}

function getCharacterPosition(index: number): [number, number, number] {
    const ringIndex = Math.floor(index / CHARACTERS_PER_RING);
    const slotIndex = index % CHARACTERS_PER_RING;
    const angle = (slotIndex / CHARACTERS_PER_RING) * Math.PI * 2;

    return [
        Math.sin(angle) * CHARACTER_RING_RADIUS,
        ringIndex * CHARACTER_RING_HEIGHT,
        Math.cos(angle) * CHARACTER_RING_RADIUS,
    ];
}

function getCharacterRotation(position: [number, number, number]): [number, number, number] {
    const [x, , z] = position;
    return [0, Math.atan2(-x, -z), 0];
}


function MouseLookTarget({
    targetRef,
    focusPoint,
}: {
    targetRef: RefObject<Object3D | null>;
    focusPoint: [number, number, number];
}) {
    const lookPlane = useMemo(() => new Plane(), []);
    const planeNormal = useMemo(() => new Vector3(), []);
    const planePoint = useMemo(() => new Vector3(), []);
    const focusPointVector = useMemo(() => new Vector3(), []);
    const intersection = useMemo(() => new Vector3(), []);

    useFrame(({ camera, pointer, raycaster }) => {
        const target = targetRef.current;
        if (!target) {
            return;
        }

        camera.getWorldDirection(planeNormal);
        focusPointVector.set(...focusPoint);
        planePoint.lerpVectors(focusPointVector, camera.position, 0.35);
        lookPlane.setFromNormalAndCoplanarPoint(planeNormal, planePoint);

        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(lookPlane, intersection)) {
            target.position.copy(intersection);
        }
    });

    return <group ref={(value) => {
        targetRef.current = value;
    }} visible={false} />;
}

function ControlledAnimatedModel({
    modelIndex,
    model,
    position,
    rotation,
    modelOffset,
    animationRequest,
    height,
    scale,
    lookTarget,
    isFocused,
}: {
    modelIndex: number;
    model: string;
    position: [number, number, number];
    rotation: [number, number, number];
    modelOffset: [number, number, number];
    animationRequest: AnimationRequest;
    height: number;
    scale: number;
    lookTarget?: RefObject<Object3D | null>;
    isFocused: boolean;
}) {
    const [animationIndex, setAnimationIndex] = useState(0);

    useEffect(() => {
        if (animationRequest.id === 0 || animationRequest.targetModelIndex !== modelIndex) return;

        setAnimationIndex((prev) => (prev + 1) % animationList.length);
    }, [animationRequest, modelIndex]);

    const animation = animationList[animationIndex];

    return (
        <group position={position} rotation={rotation}>
            <AnimatedModel
                model={model}
                modelOffset={modelOffset}
                animation={animation}
                animationOverrides={animationOverrides}
                height={height}
                scale={scale}
                lookTarget={ENABLE_MOUSE_LOOK && isFocused ? lookTarget : undefined}
            >
                <Mouth />
                <BoneAttachment
                    attachpoint="mixamorigRightHand"
                    position={[2, 0, 0]}
                    scale={[100, 100, 100]}
                    rotation={[0.7, 0, -1]}
                >
                    <SimpleModel modelUrl="/models/environment/Katana.glb" />
                </BoneAttachment>
            </AnimatedModel>
        </group>
    );
}

export default function CharacterPage() {
    const mouseLookTargetRef = useRef<Object3D | null>(null);
    const [focusedModelIndex, setFocusedModelIndex] = useState(0);
    const [animationRequest, setAnimationRequest] = useState<AnimationRequest>({ id: 0, targetModelIndex: 0 });
    const [focusedHeight, setFocusedHeight] = useState(1);
    const [focusedScale, setFocusedScale] = useState(1);
    const [focusedYOffset, setFocusedYOffset] = useState(0);
    const [focusedModelAsset, setFocusedModelAsset] = useState<FocusedModelAsset | null>(null);
    const [isLoadingAnimations, setIsLoadingAnimations] = useState(false);
    const [animationLoadError, setAnimationLoadError] = useState<string | null>(null);
    const [isExportingGlb, setIsExportingGlb] = useState(false);
    const floorCount = Math.ceil(ALL_MODELS.length / CHARACTERS_PER_RING);
    const focusedModelUrl = ALL_MODELS[focusedModelIndex];
    const characterLayouts = useMemo(() => ALL_MODELS.map((modelUrl, index) => {
        const position = getCharacterPosition(index);

        return {
            modelUrl,
            index,
            position,
            rotation: getCharacterRotation(position),
        };
    }), []);
    const focusedPosition = characterLayouts[focusedModelIndex]?.position ?? [0, 0, 0];
    const mouseLookFocusPoint: [number, number, number] = [
        focusedPosition[0],
        focusedPosition[1] + focusedYOffset + focusedHeight * 0.8,
        focusedPosition[2],
    ];

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
        <GameCanvas>
            {ENABLE_MOUSE_LOOK && <MouseLookTarget targetRef={mouseLookTargetRef} focusPoint={mouseLookFocusPoint} />}
            <CharacterTowerBackdrop floorCount={floorCount} />
            {characterLayouts.map(({ modelUrl, index, position, rotation }) => {
                const isFocused = index === focusedModelIndex;

                return (
                    <ControlledAnimatedModel
                        key={modelUrl}
                        modelIndex={index}
                        model={modelUrl}
                        position={position}
                        rotation={rotation}
                        modelOffset={[0, isFocused ? focusedYOffset : 0, 0]}
                        animationRequest={animationRequest}
                        height={isFocused ? focusedHeight : 1}
                        scale={isFocused ? focusedScale : 1}
                        lookTarget={mouseLookTargetRef}
                        isFocused={isFocused}
                    />
                );
            })}

            <ambientLight intensity={2} />
            <DebugGroundVisual position={[0, -2, 0]} />

            <CameraRig focusedCharacterIndex={focusedModelIndex} />

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
                <button type="button" onClick={() => setFocusedModelIndex((prev) => (prev - 1 + ALL_MODELS.length) % ALL_MODELS.length)}>&lt;--</button>
                <button type="button" onClick={() => setFocusedModelIndex((prev) => (prev + 1) % ALL_MODELS.length)}>--&gt;</button>
            </div>
            {ALL_MODELS[focusedModelIndex]}

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
            <button type="button">add instance</button>
            <button type="button" onClick={() => setAnimationRequest((prev) => ({
                id: prev.id + 1,
                targetModelIndex: focusedModelIndex,
            }))}>
                next animation
            </button>
            <button
                type="button"
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

const CameraRig = ({ focusedCharacterIndex }: { focusedCharacterIndex: number }) => {
    const orbitControlsRef = useRef<OrbitControlsImpl>(null);
    const { camera } = useThree();


    useEffect(() => {
        const position = getCharacterPosition(focusedCharacterIndex);
        camera.position.set(0, position[1] + 2, 0);
        orbitControlsRef.current?.target.set(...position);
        orbitControlsRef.current?.update();
    }, [focusedCharacterIndex, camera]);

    return <>
        <OrbitControls ref={orbitControlsRef} makeDefault enablePan={false} enableDamping />
    </>
}
