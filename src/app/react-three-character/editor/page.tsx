"use client";

import { GameCanvas } from "react-three-game";
import { useFrame, useThree } from "@react-three/fiber";
import { Box, Environment, OrbitControls } from "@react-three/drei";
import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const animationOverrides = {
    idle: "/models/human/anim/idle.fbx",
    walk: "/models/human/anim/walk.fbx",
    walkLeft: "/models/human/anim/walkLeft.fbx",
    run: "/models/human/anim/run.fbx",
};

const animationList = Object.keys(animationOverrides);

const INITIAL_MODELS = [
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

type ModelListItem = {
    url: string;
    label: string;
};

type ModelListState = {
    models: ModelListItem[];
    focusedModelIndex: number;
};

type LoadedAnimationItem = {
    name: string;
    source: "model" | "override";
    path?: string;
    clip: AnimationClip;
};

type FocusedModelAsset = {
    modelUrl: string;
    scene: Object3D;
    animations: LoadedAnimationItem[];
};

type ModelRenderBoundaryProps = {
    modelUrl: string;
    onError: (modelUrl: string, error: Error) => void;
    children: React.ReactNode;
};

class ModelRenderBoundary extends Component<ModelRenderBoundaryProps, { didFail: boolean }> {
    state = { didFail: false };

    static getDerivedStateFromError() {
        return { didFail: true };
    }

    componentDidCatch(error: Error) {
        this.props.onError(this.props.modelUrl, error);
    }

    componentDidUpdate(prevProps: ModelRenderBoundaryProps) {
        if (prevProps.modelUrl !== this.props.modelUrl && this.state.didFail) {
            this.setState({ didFail: false });
        }
    }

    render() {
        return this.state.didFail ? null : this.props.children;
    }
}

const gltfAssetCache = new Map<string, Promise<{ scene: Object3D; animations: AnimationClip[] }>>();
const fbxClipCache = new Map<string, Promise<AnimationClip | null>>();

function getInitialModelList(): ModelListItem[] {
    return INITIAL_MODELS.map((url) => ({
        url,
        label: url,
    }));
}

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

const CHARACTERS_PER_RING = 6;
const CHARACTER_RING_RADIUS = 4.5;
const CHARACTER_RING_HEIGHT = 3;
const FLOOR_DISC_RADIUS = CHARACTER_RING_RADIUS + 1.8;
const FLOOR_DISC_INNER_RADIUS = CHARACTER_RING_RADIUS - 1.1;
const ENABLE_MOUSE_LOOK = true;
const CHARACTER_PODIUM_HEIGHT = 0.12;
const CHARACTER_PODIUM_RADIUS = 0.54;
const FLOOR_Y_OFFSET = 0.12;

function CharacterTowerBackdrop({
    floorCount,
    characterLayouts,
}: {
    floorCount: number;
    characterLayouts: Array<{ modelUrl: string; index: number; position: [number, number, number] }>;
}) {
    const wallHeight = Math.max(CHARACTER_RING_HEIGHT * floorCount + 2, 6);

    return (
        <group>
            <mesh position={[0, wallHeight / 2 - 1, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[FLOOR_DISC_RADIUS, FLOOR_DISC_RADIUS, wallHeight, 48, 1, true]} />
                <meshStandardMaterial color="#8f8578" roughness={0.95} metalness={0.05} side={DoubleSide} />
            </mesh>

            {Array.from({ length: floorCount }, (_, floorIndex) => {
                const floorLevelY = floorIndex * CHARACTER_RING_HEIGHT;
                const floorY = floorLevelY - FLOOR_Y_OFFSET;
                const floorCharacters = characterLayouts.filter(({ index }) => Math.floor(index / CHARACTERS_PER_RING) === floorIndex);

                return (
                    <group key={`floor-${floorY}`}>
                        <mesh position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
                            <ringGeometry args={[FLOOR_DISC_INNER_RADIUS, FLOOR_DISC_RADIUS, 48, 1]} />
                            <meshStandardMaterial color="#a2998c" roughness={0.97} metalness={0.03} side={DoubleSide} />
                        </mesh>

                        {floorCharacters.map(({ modelUrl, position }) => (
                            <mesh
                                key={`base-${modelUrl}`}
                                position={[position[0], floorY + CHARACTER_PODIUM_HEIGHT / 2, position[2]]}
                                receiveShadow
                                castShadow
                            >
                                <cylinderGeometry args={[CHARACTER_PODIUM_RADIUS * 1.05, CHARACTER_PODIUM_RADIUS, CHARACTER_PODIUM_HEIGHT, 32]} />
                                <meshStandardMaterial color="#d4c27a" roughness={0.96} metalness={0.03} />
                            </mesh>
                        ))}
                    </group>
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
    model,
    position,
    rotation,
    modelOffset,
    animation,
    height,
    scale,
    lookTarget,
    isFocused,
}: {
    model: string;
    position: [number, number, number];
    rotation: [number, number, number];
    modelOffset: [number, number, number];
    animation: string;
    height: number;
    scale: number;
    lookTarget?: RefObject<Object3D | null>;
    isFocused: boolean;
}) {
    return (
        <group position={position} rotation={rotation}>
            <Box args={[0.5, 0.001, 0.5]}>
                <meshStandardMaterial color="white" wireframe />
            </Box>
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
    const pageRef = useRef<HTMLDivElement | null>(null);
    const mouseLookTargetRef = useRef<Object3D | null>(null);
    const uploadedModelUrlsRef = useRef<string[]>([]);
    const [{ models, focusedModelIndex }, setModelListState] = useState<ModelListState>(() => ({
        models: getInitialModelList(),
        focusedModelIndex: 0,
    }));
    const [currentAnimation, setCurrentAnimation] = useState(animationList[0] ?? "idle");
    const [focusedHeight, setFocusedHeight] = useState(1);
    const [focusedScale, setFocusedScale] = useState(1);
    const [focusedYOffset, setFocusedYOffset] = useState(0);
    const [focusedModelAsset, setFocusedModelAsset] = useState<FocusedModelAsset | null>(null);
    const [isLoadingAnimations, setIsLoadingAnimations] = useState(false);
    const [animationLoadError, setAnimationLoadError] = useState<string | null>(null);
    const [isExportingGlb, setIsExportingGlb] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const floorCount = Math.ceil(models.length / CHARACTERS_PER_RING);
    const focusedModel = models[focusedModelIndex] ?? models[0];
    const focusedModelUrl = focusedModel?.url;
    const characterLayouts = useMemo(() => models.map(({ url: modelUrl }, index) => {
        const position = getCharacterPosition(index);

        return {
            modelUrl,
            index,
            position,
            rotation: getCharacterRotation(position),
        };
    }), [models]);
    const focusedPosition = characterLayouts[focusedModelIndex]?.position ?? [0, 0, 0];
    const mouseLookFocusPoint: [number, number, number] = [
        focusedPosition[0],
        focusedPosition[1] + focusedYOffset + focusedHeight * 0.8,
        focusedPosition[2],
    ];

    useEffect(() => {
        return () => {
            uploadedModelUrlsRef.current.forEach((url) => {
                URL.revokeObjectURL(url);
            });
            uploadedModelUrlsRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (!focusedModelUrl) {
            setFocusedModelAsset(null);
            setIsLoadingAnimations(false);
            return;
        }

        let disposed = false;

        setIsLoadingAnimations(true);
        setAnimationLoadError(null);
        setFocusedModelAsset(null);

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
                const animations: LoadedAnimationItem[] = [];

                for (const clip of modelAsset.animations) {
                    const clipName = clip.name.trim();
                    const normalizedName = clipName.toLowerCase();
                    if (!clipName || seenNames.has(normalizedName)) {
                        continue;
                    }

                    const exportClip = stripNeckTracks(clip);
                    seenNames.add(normalizedName);
                    animations.push({ name: clipName, source: "model", clip: exportClip });
                }

                for (const entry of overrideEntries) {
                    if (!entry.clip || seenNames.has(entry.name.toLowerCase())) {
                        continue;
                    }

                    const clip = entry.clip.clone();
                    clip.name = entry.name;
                    seenNames.add(entry.name.toLowerCase());
                    animations.push({ name: entry.name, source: "override", path: entry.path, clip });
                }

                setFocusedModelAsset({
                    modelUrl: focusedModelUrl,
                    scene: modelAsset.scene,
                    animations,
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

    const reportModelRenderError = useCallback((modelUrl: string, error: Error) => {
        const model = models.find((item) => item.url === modelUrl);
        setAnimationLoadError(`${model?.label ?? modelUrl}: ${error.message}`);
    }, [models]);

    const addDroppedModel = useCallback((file: File) => {
        if (!file.name.toLowerCase().endsWith(".glb")) {
            setAnimationLoadError("Only .glb files can be added to the model list.");
            return;
        }

        const objectUrl = URL.createObjectURL(file);

        setAnimationLoadError(null);

        void loadModelAsset(objectUrl)
            .then(() => {
                uploadedModelUrlsRef.current.push(objectUrl);
                setModelListState((prev) => ({
                    models: [...prev.models, { url: objectUrl, label: file.name }],
                    focusedModelIndex: prev.models.length,
                }));
            })
            .catch((error) => {
                URL.revokeObjectURL(objectUrl);
                gltfAssetCache.delete(objectUrl);
                setAnimationLoadError(error instanceof Error ? error.message : "Failed to load dropped GLB.");
            })
    }, []);

    useEffect(() => {
        const pageElement = pageRef.current;
        if (!pageElement) {
            return;
        }

        const dropSurface = pageElement;

        function handleDragOver(event: globalThis.DragEvent) {
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "copy";
            }
            setIsDragOver(true);
        }

        function handleDragLeave(event: globalThis.DragEvent) {
            const nextTarget = event.relatedTarget;
            if (nextTarget instanceof Node && dropSurface.contains(nextTarget)) {
                return;
            }

            setIsDragOver(false);
        }

        function handleDrop(event: globalThis.DragEvent) {
            event.preventDefault();
            setIsDragOver(false);

            const droppedFile = Array.from(event.dataTransfer?.files ?? []).find((file) => file.name.toLowerCase().endsWith(".glb"));
            if (!droppedFile) {
                setAnimationLoadError("Drop a .glb file to add it to the model list.");
                return;
            }

            addDroppedModel(droppedFile);
        }

        dropSurface.addEventListener("dragover", handleDragOver);
        dropSurface.addEventListener("dragleave", handleDragLeave);
        dropSurface.addEventListener("drop", handleDrop);

        return () => {
            dropSurface.removeEventListener("dragover", handleDragOver);
            dropSurface.removeEventListener("dragleave", handleDragLeave);
            dropSurface.removeEventListener("drop", handleDrop);
        };
    }, [addDroppedModel]);

    useEffect(() => {
        if (!focusedModelAsset) {
            return;
        }

        const hasCurrentAnimation = focusedModelAsset.animations.some((clip) => clip.name === currentAnimation);
        if (hasCurrentAnimation) {
            return;
        }

        setCurrentAnimation(focusedModelAsset.animations[0]?.name ?? (animationList[0] ?? "idle"));
    }, [currentAnimation, focusedModelAsset]);

    function removeAnimation(animationName: string) {
        setFocusedModelAsset((prev) => {
            if (!prev) {
                return prev;
            }

            const normalizedName = animationName.toLowerCase();

            return {
                ...prev,
                animations: prev.animations.filter((clip) => clip.name.toLowerCase() !== normalizedName),
            };
        });
    }

    async function downloadPackedGlb() {
        if (!focusedModelAsset) {
            return;
        }

        setIsExportingGlb(true);
        setAnimationLoadError(null);

        try {
            const glbData = await exportPackedGlb(focusedModelAsset.scene, focusedModelAsset.animations.map((animation) => animation.clip));
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

    return <div ref={pageRef} className={`relative w-screen h-screen ${isDragOver ? "bg-white/5" : ""}`}>
        <GameCanvas>
            {ENABLE_MOUSE_LOOK && <MouseLookTarget targetRef={mouseLookTargetRef} focusPoint={mouseLookFocusPoint} />}
            <CharacterTowerBackdrop floorCount={floorCount} characterLayouts={characterLayouts} />
            {characterLayouts.map(({ modelUrl, index, position, rotation }) => {
                const isFocused = index === focusedModelIndex;

                return (
                    <ModelRenderBoundary key={modelUrl} modelUrl={modelUrl} onError={reportModelRenderError}>
                        <ControlledAnimatedModel
                            model={modelUrl}
                            position={position}
                            rotation={rotation}
                            modelOffset={[0, isFocused ? focusedYOffset : 0, 0]}
                            animation={isFocused ? currentAnimation : animationList[0] ?? "idle"}
                            height={isFocused ? focusedHeight : 1}
                            scale={isFocused ? focusedScale : 1}
                            lookTarget={mouseLookTargetRef}
                            isFocused={isFocused}
                        />
                    </ModelRenderBoundary>
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
        {isDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/35 text-sm uppercase tracking-[0.3em] text-white/90">
                drop glb to add model
            </div>
        )}
        <div className="absolute top-8 right-8 flex w-64 flex-col gap-3 rounded bg-black/50 p-4 text-white">

            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={() => setModelListState((prev) => ({
                        ...prev,
                        focusedModelIndex: (prev.focusedModelIndex - 1 + prev.models.length) % prev.models.length,
                    }))}
                >
                    &lt;--
                </button>
                <button
                    type="button"
                    onClick={() => setModelListState((prev) => ({
                        ...prev,
                        focusedModelIndex: (prev.focusedModelIndex + 1) % prev.models.length,
                    }))}
                >
                    --&gt;
                </button>
            </div>
            <div className="break-all text-sm">{focusedModel?.label ?? "No model selected"}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">drag and drop a .glb anywhere on the page to add it</div>

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
            <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">Loaded animations</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/60">current: {currentAnimation}</div>
                </div>
                {isLoadingAnimations && <div className="text-white/70">loading...</div>}
                {!isLoadingAnimations && animationLoadError && <div className="text-red-300">{animationLoadError}</div>}
                {!isLoadingAnimations && !animationLoadError && focusedModelAsset?.animations.length === 0 && (
                    <div className="text-white/70">No animations found.</div>
                )}
                {!isLoadingAnimations && !animationLoadError && focusedModelAsset?.animations.map((clip) => (
                    <div key={`${clip.source}-${clip.name}`} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white/90">
                        <div className="min-w-0 break-all">
                            <span className={clip.name === currentAnimation ? "text-white" : undefined}>{clip.name}</span>{" "}
                            <span className="text-white/50">({clip.source})</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentAnimation(clip.name)}
                                disabled={clip.name === currentAnimation}
                                aria-label={`Play ${clip.name}`}
                                className="rounded border border-white/15 px-2 py-0.5 text-xs text-white/90 transition hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
                            >
                                ▶
                            </button>
                            <button
                                type="button"
                                onClick={() => removeAnimation(clip.name)}
                                aria-label={`Remove ${clip.name}`}
                                className="rounded border border-red-300/20 px-2 py-0.5 text-xs text-red-200 transition hover:bg-red-300/10"
                            >
                                x
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={() => void downloadPackedGlb()}
                disabled={!focusedModelAsset || isLoadingAnimations || isExportingGlb}
                className="disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isExportingGlb ? "packing glb..." : "download glb with animations"}
            </button>

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

    return <OrbitControls ref={orbitControlsRef} makeDefault enablePan={false} enableDamping />
}
