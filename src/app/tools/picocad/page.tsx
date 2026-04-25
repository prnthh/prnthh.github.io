"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Prefab, PrefabEditor, PrefabEditorRef, useEditorContext } from "react-three-game";
import { LoadingManager, Material, Object3D, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import PixelationEffect from "./PixelationEffect";

type SupportedAssetType = "glb" | "gltf" | "bin" | "png";
type TransformMode = "translate" | "rotate" | "scale";
type Vec3 = [number, number, number];

type AssetSlots = Partial<Record<SupportedAssetType, File>>;

const ASSET_CONFIG: Array<{ type: SupportedAssetType; label: string; accept: string }> = [
    { type: "glb", label: "GLB", accept: ".glb" },
    { type: "gltf", label: "GLTF", accept: ".gltf" },
    { type: "bin", label: "BIN", accept: ".bin" },
    { type: "png", label: "PNG", accept: ".png" },
];

const VISIBLE_ASSET_CONFIG = ASSET_CONFIG.filter(config => config.type !== "glb");
const SAMPLE_NAMES = ["question", "tablet"] as const;
const DEFAULT_SCALE: Vec3 = [1, 1, 1];
const EMPTY_PREFAB: Prefab = {
    id: "picocad-editor",
    name: "Picocad Scene",
    root: {
        id: "root",
        name: "Root",
        components: {
            transform: {
                type: "Transform",
                properties: {
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1],
                },
            },
        },
        children: [],
    },
};

function TransformModeBridge({ mode }: { mode: TransformMode }) {
    const { setTransformMode } = useEditorContext();

    useEffect(() => {
        setTransformMode(mode);
    }, [mode, setTransformMode]);

    return null;
}

function getFileExtension(filename: string): SupportedAssetType | null {
    const extension = filename.toLowerCase().split(".").pop();

    if (extension === "glb" || extension === "gltf" || extension === "bin" || extension === "png") {
        return extension;
    }

    return null;
}

function getAssetTypeFromReference(value: string) {
    const normalized = value.toLowerCase().split(/[?#]/)[0].replace(/\\/g, "/");
    const filename = normalized.split("/").pop() ?? normalized;

    return getFileExtension(filename);
}

function mergeSupportedFiles(files: File[], currentAssets: AssetSlots) {
    const nextAssets = { ...currentAssets };

    files.forEach(file => {
        const type = getFileExtension(file.name);

        if (!type) {
            return;
        }

        if (type === "glb") {
            delete nextAssets.gltf;
            delete nextAssets.bin;
            delete nextAssets.png;
        }

        if (type === "gltf") {
            delete nextAssets.glb;
        }

        nextAssets[type] = file;
    });

    return nextAssets;
}

function getPrimarySceneAsset(assets: AssetSlots) {
    return assets.glb ?? assets.gltf ?? null;
}

function getAssetByReference(assets: AssetSlots, value: string) {
    const referenceType = getAssetTypeFromReference(value);
    return referenceType ? assets[referenceType] ?? null : null;
}

function getMissingAssetLabels(assets: AssetSlots) {
    if (assets.glb) {
        return [] as string[];
    }

    if (!assets.gltf) {
        return ["GLTF"];
    }

    return VISIBLE_ASSET_CONFIG
        .filter(config => config.type !== "gltf")
        .filter(config => !assets[config.type])
        .map(config => config.label);
}

function disposeMaterial(material: Material) {
    Object.values(material).forEach(value => {
        if (value instanceof Texture) {
            value.dispose();
        }
    });

    material.dispose();
}

function disposeObject(object: Object3D) {
    object.traverse(child => {
        const mesh = child as Object3D & {
            geometry?: { dispose: () => void };
            material?: Material | Material[];
        };

        mesh.geometry?.dispose();

        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(disposeMaterial);
            return;
        }

        if (mesh.material) {
            disposeMaterial(mesh.material);
        }
    });
}

function downloadArrayBuffer(buffer: ArrayBuffer, filename: string) {
    const blob = new Blob([buffer], { type: "model/gltf-binary" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function loadSampleAssets(sampleName: (typeof SAMPLE_NAMES)[number]) {
    const entries = await Promise.all(
        VISIBLE_ASSET_CONFIG.map(async config => {
            const response = await fetch(`/models/environment/picocad/${sampleName}.${config.type}`);

            if (!response.ok) {
                throw new Error(`Failed to load ${sampleName} ${config.label} asset.`);
            }

            const blob = await response.blob();

            return [
                config.type,
                new File([blob], `${sampleName}.${config.type}`, { type: blob.type || "application/octet-stream" }),
            ] as const;
        }),
    );

    return Object.fromEntries(entries) as AssetSlots;
}

export default function PicocadPage() {
    const [assets, setAssets] = useState<AssetSlots>({});
    const [loadedScene, setLoadedScene] = useState<Object3D | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [loadingSampleName, setLoadingSampleName] = useState<string | null>(null);
    const [pixelSize, setPixelSize] = useState(6);
    const [transformMode, setTransformMode] = useState<TransformMode>("translate");
    const [uniformScale, setUniformScale] = useState(1);
    const [editorReady, setEditorReady] = useState(false);
    const [modelNodeId, setModelNodeId] = useState<string | null>(null);
    const editorRef = useRef<PrefabEditorRef | null>(null);
    const injectedSceneRef = useRef<Object3D | null>(null);
    const fileInputRefs = useRef<Record<SupportedAssetType, HTMLInputElement | null>>({
        glb: null,
        gltf: null,
        bin: null,
        png: null,
    });

    const primarySceneAsset = useMemo(() => getPrimarySceneAsset(assets), [assets]);
    const missingAssetLabels = useMemo(() => getMissingAssetLabels(assets), [assets]);
    const exportFilename = primarySceneAsset
        ? `${primarySceneAsset.name.replace(/\.[^.]+$/, "")}.glb`
        : "picocad-export.glb";
    const handleEditorRef = useCallback((value: PrefabEditorRef | null) => {
        editorRef.current = value;
        if (value) {
            setEditorReady(true);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (injectedSceneRef.current) {
                disposeObject(injectedSceneRef.current);
                injectedSceneRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const sceneAsset = getPrimarySceneAsset(assets);
        let cancelled = false;

        if (!sceneAsset) {
            setIsLoading(false);
            setLoadError(null);
            setLoadedScene(null);
            return;
        }

        if (sceneAsset === assets.gltf && missingAssetLabels.length > 0) {
            setIsLoading(false);
            setLoadError(null);
            setLoadedScene(null);
            return;
        }

        setLoadError(null);
        setExportError(null);

        const loadScene = async () => {
            const manager = new LoadingManager();
            const objectUrls = new Map<string, string>();

            const getObjectUrl = (file: File) => {
                const cachedUrl = objectUrls.get(file.name);

                if (cachedUrl) {
                    return cachedUrl;
                }

                const nextUrl = URL.createObjectURL(file);
                objectUrls.set(file.name, nextUrl);
                return nextUrl;
            };

            manager.setURLModifier(url => {
                const fileAsset = getAssetByReference(assets, url);

                if (!fileAsset) {
                    return url;
                }

                return getObjectUrl(fileAsset);
            });

            setIsLoading(true);

            const loader = new GLTFLoader(manager);

            try {
                const gltf = await loader.loadAsync(getObjectUrl(sceneAsset));

                if (cancelled) {
                    disposeObject(gltf.scene);
                    return;
                }

                setLoadedScene(gltf.scene);
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setLoadedScene(null);
                setLoadError(error instanceof Error ? error.message : "Failed to assemble dropped assets.");
            } finally {
                objectUrls.forEach(url => URL.revokeObjectURL(url));

                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadScene().catch(error => {
            if (cancelled) {
                return;
            }

            setIsLoading(false);
            setLoadedScene(null);
            setLoadError(error instanceof Error ? error.message : "Failed to assemble dropped assets.");
        });

        return () => {
            cancelled = true;
        };
    }, [assets, missingAssetLabels]);

    useEffect(() => {
        const editor = editorRef.current;
        const previousInjectedScene = injectedSceneRef.current;

        if (!editorReady || !editor) {
            return;
        }

        if (!loadedScene) {
            editor.load(EMPTY_PREFAB, { resetHistory: true });
            injectedSceneRef.current = null;
            setModelNodeId(null);
            setUniformScale(1);

            if (previousInjectedScene) {
                disposeObject(previousInjectedScene);
            }

            return;
        }

        const sceneName = primarySceneAsset?.name.replace(/\.[^.]+$/, "") || "Picocad Model";
        const editorModelPath = `imports/${primarySceneAsset?.name ?? "model.glb"}`;

        editor.load({
            ...EMPTY_PREFAB,
            name: sceneName,
        }, { resetHistory: true });
        const modelNode = editor.addModel(editorModelPath, loadedScene, {
            name: sceneName,
            parentId: "root",
            select: true,
        });
        setModelNodeId(modelNode.id);
        setUniformScale(1);
        injectedSceneRef.current = loadedScene;

        if (previousInjectedScene && previousInjectedScene !== loadedScene) {
            disposeObject(previousInjectedScene);
        }
    }, [editorReady, loadedScene, primarySceneAsset]);

    function addFiles(files: File[]) {
        setAssets(previousAssets => mergeSupportedFiles(files, previousAssets));
    }

    function handleTypedInputChange(type: SupportedAssetType, event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (file) {
            setAssets(previousAssets => mergeSupportedFiles([file], previousAssets));
        }

        event.target.value = "";
    }

    function onDragEnter(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }

    function onDragLeave(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();

        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
        }

        setIsDragging(false);
    }

    function onDragOver(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();

        if (!isDragging) {
            setIsDragging(true);
        }
    }

    function onDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        addFiles(Array.from(event.dataTransfer.files));
    }

    function clearAssets() {
        setAssets({});
        setLoadError(null);
        setExportError(null);
    }

    function removeAsset(type: SupportedAssetType) {
        setAssets(previousAssets => {
            const nextAssets = { ...previousAssets };

            delete nextAssets[type];

            return nextAssets;
        });
    }

    function openFilePicker(type: SupportedAssetType) {
        fileInputRefs.current[type]?.click();
    }

    async function applySample(sampleName: (typeof SAMPLE_NAMES)[number]) {
        setLoadingSampleName(sampleName);
        setLoadError(null);
        setExportError(null);

        try {
            const sampleAssets = await loadSampleAssets(sampleName);
            setAssets(sampleAssets);
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : `Failed to load ${sampleName} sample.`);
        } finally {
            setLoadingSampleName(null);
        }
    }

    async function downloadGlb() {
        if (!loadedScene || !editorRef.current) {
            return;
        }

        setIsExporting(true);
        setExportError(null);

        try {
            const result = await editorRef.current.exportGLBData();

            if (!result) {
                setExportError("Failed to export GLB.");
                return;
            }

            downloadArrayBuffer(result, exportFilename);
        } catch (error) {
            setExportError(error instanceof Error ? error.message : "Failed to export GLB.");
        } finally {
            setIsExporting(false);
        }
    }

    function updateUniformScale(nextScale: number) {
        setUniformScale(nextScale);

        if (!modelNodeId || !editorRef.current) {
            return;
        }

        const node = editorRef.current.getNode(modelNodeId);

        if (!node) {
            return;
        }

        const scale: Vec3 = [nextScale, nextScale, nextScale];

        editorRef.current.updateNode(modelNodeId, currentNode => {
            const transformComponent = currentNode.components?.transform;

            return {
                ...currentNode,
                components: {
                    ...currentNode.components,
                    transform: {
                        type: "Transform",
                        properties: {
                            position: transformComponent?.type === "Transform"
                                ? (transformComponent.properties.position as Vec3 | undefined) ?? [0, 0, 0]
                                : [0, 0, 0],
                            rotation: transformComponent?.type === "Transform"
                                ? (transformComponent.properties.rotation as Vec3 | undefined) ?? [0, 0, 0]
                                : [0, 0, 0],
                            scale,
                        },
                    },
                },
            };
        });
    }

    return (
        <div
            className="noscrollbar relative grid h-screen grid-cols-1 overflow-x-hidden overflow-y-auto bg-[#8f84b0] font-bold text-[#ffd5e8] lg:h-auto lg:min-h-screen lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-y-visible"
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {ASSET_CONFIG.map(config => (
                <input
                    key={config.type}
                    ref={node => {
                        fileInputRefs.current[config.type] = node;
                    }}
                    type="file"
                    accept={config.accept}
                    onChange={event => handleTypedInputChange(config.type, event)}
                    hidden
                />
            ))}

            <main className="relative aspect-square w-full border-b-4 border-[#24315d] bg-[#24315d] lg:min-h-screen lg:aspect-auto lg:border-b-0 lg:border-r-4">
                <PrefabEditor
                    ref={handleEditorRef}
                    initialPrefab={EMPTY_PREFAB}
                    physics={false}
                    showUI={false}
                    enableWindowDrop={false}
                    canvasProps={{
                        style: {
                            width: "100%",
                            height: "100%",
                            display: "block",
                            touchAction: "pan-y",
                        },
                    }}
                >
                    <ambientLight intensity={2} />
                    <TransformModeBridge mode={transformMode} />
                    {pixelSize > 0 && (
                        <PixelationEffect pixelSize={pixelSize} normalEdgeStrength={0.3} depthEdgeStrength={0.4} />
                    )}
                </PrefabEditor>
            </main>

            <aside className="border-t-4 border-[#24315d] bg-[#7b2154] text-[#ffb1cf] lg:h-screen lg:overflow-y-auto lg:border-t-0 lg:border-l-4">
                <div className="flex h-full w-full flex-col items-center bg-[#7b2154] text-[#ffb1cf] lg:min-h-full">
                    <div className="w-full border-b-4 border-[#24315d] bg-[#ff1654] px-4 py-3 text-center text-[#fff2f4]">
                        <p className="text-xl font-bold tracking-wide">
                            <a
                                href="https://picocad.net/"
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-[#b6ddff]"
                            >
                                picoCAD
                            </a>{" "}
                            export combinator
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#ffd6df]">advanced postprocessing <br /> for picoCAD models</p>
                    </div>

                    <div className="flex w-full flex-1 flex-col items-center p-4 text-center">
                        <div className="w-full max-w-[320px] border-b-4 border-[#24315d] pb-4">
                            <p className="text-sm leading-6 text-[#ffb1cf]">
                                Drop a picoCAD GLTF + BIN + PNG <br />
                                (Export &gt; Export GLTF) <br />
                            </p>
                        </div>

                        <div className="flex items-center gap-2 my-4">
                            <h2 className="text-sm font-bold uppercase text-[#ffd5e8]">Samples</h2>
                            <div className="flex gap-2">
                                {SAMPLE_NAMES.map(sampleName => (
                                    <button
                                        key={sampleName}
                                        className="bg-[#ff1654] px-3 py-2 text-xs font-bold uppercase text-[#fff2f4] transition hover:bg-[#c01343] disabled:cursor-not-allowed disabled:bg-[#7d7496] disabled:text-[#b8afd0]"
                                        type="button"
                                        onClick={() => applySample(sampleName)}
                                        disabled={loadingSampleName !== null}
                                    >
                                        {loadingSampleName === sampleName ? `Loading ${sampleName}...` : sampleName}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full max-w-[320px] bg-[#ffccaa] p-4 text-[#24315d]">
                            <div className="flex items-center justify-between ">
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#24315d]">Files</h2>
                                <button
                                    className="bg-[#ff1654] p-1 text-sm text-[#fff2f4] hover:bg-[#ff4a7a]"
                                    type="button"
                                    onClick={clearAssets}
                                >
                                    Clear
                                </button>
                            </div>

                            {VISIBLE_ASSET_CONFIG.map(config => {
                                const file = assets[config.type];

                                return (
                                    <div key={config.type} className="flex items-center my-1">
                                        {file && (
                                            <span
                                                className="mr-2 flex h-4 w-4 items-center justify-center text-[#ff9c00]"
                                                aria-label={`${config.label} added`}
                                                title={`${config.label} added`}
                                            >
                                                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                                                </svg>
                                            </span>
                                        )}

                                        <div className="min-w-0 flex-1 text-left">
                                            {file ? file.name : config.accept}
                                        </div>

                                        <div className="ml-3 flex items-center justify-end">
                                            {file ? (
                                                <button
                                                    className="bg-[#ff1654] px-3 py-1 text-xs font-bold uppercase text-[#fff2f4] transition hover:bg-[#c01343]"
                                                    type="button"
                                                    onClick={() => removeAsset(config.type)}
                                                    aria-label={`Remove ${config.label} file`}
                                                    title={`Remove ${config.label} file`}
                                                >
                                                    Remove
                                                </button>
                                            ) : (
                                                <button
                                                    className="bg-[#ff1654] px-3 py-1 text-xs font-bold uppercase text-[#fff2f4] transition hover:bg-[#c01343]"
                                                    type="button"
                                                    onClick={() => openFilePicker(config.type)}
                                                    aria-label={`Add ${config.label} file`}
                                                    title={`Add ${config.label} file`}
                                                >
                                                    Add
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {loadedScene ? (
                            <div className="mt-5">
                                <button
                                    className="bg-[#ff1654] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[#fff2f4] transition disabled:cursor-not-allowed disabled:bg-[#7d7496] disabled:text-[#b8afd0]"
                                    type="button"
                                    onClick={downloadGlb}
                                    disabled={isLoading || isExporting}
                                >
                                    {isExporting ? "Exporting..." : "Download GLB"}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-5 text-sm text-[#24315d]">
                                {loadError ? loadError : missingAssetLabels.length > 0 ? `Waiting for: ${missingAssetLabels.join(", ")}` : isLoading ? "Loading..." : "Waiting for model..."}
                            </div>
                        )}

                        {exportError && <div className="mt-3 text-sm text-[#7b2154]">{exportError}</div>}


                        <div className="mt-4 w-full max-w-[320px] space-y-3  p-4 border-t-4 border-[#24315d]">
                            <div className="w-full text-left">
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffd5e8]">Transform</h2>
                                <div className="mt-3 flex gap-2 justify-center">
                                    {([
                                        ["translate", "Move"],
                                        ["rotate", "Rotate"],
                                        ["scale", "Scale"],
                                    ] as const).map(([mode, label]) => (
                                        <button
                                            key={mode}
                                            className={[
                                                "min-w-10 px-3 py-2 text-sm font-bold uppercase",
                                                transformMode === mode
                                                    ? "bg-[#ff1654] text-[#fff2f4]"
                                                    : "bg-[#ffccaa] text-[#24315d] hover:bg-[#ffd8bd]",
                                            ].join(" ")}
                                            type="button"
                                            onClick={() => setTransformMode(mode)}
                                            aria-label={`${mode} transform mode`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {loadedScene && transformMode === "scale" && (
                                    <label className="mt-4 flex w-full flex-col items-start gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ffd5e8]">
                                        <div className="flex w-full items-center justify-between">
                                            <span>Uniform Scale</span>
                                            <span>{uniformScale.toFixed(2)}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="4"
                                            step="0.05"
                                            value={uniformScale}
                                            onChange={event => updateUniformScale(Number(event.target.value))}
                                            className="w-full accent-[#ff1654]"
                                            aria-label="Uniform model scale"
                                        />
                                    </label>
                                )}
                            </div>


                        </div>

                        <div className="mt-4 w-full p-4 border-t-4 border-[#24315d]">

                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffd5e8] w-full text-left">Effects</h2>

                            <label className="mt-4 flex w-full flex-col items-start gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ffd5e8]">
                                <div className="flex w-full items-center justify-between">
                                    <span>Pixelate</span>
                                    <span>{pixelSize}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="12"
                                    step="1"
                                    value={pixelSize}
                                    onChange={event => setPixelSize(Number(event.target.value))}
                                    className="w-full accent-[#ff1654]"
                                />
                                <span>{pixelSize === 0 ? "Off" : `Strength ${pixelSize}`}</span>
                            </label>
                        </div>

                    </div>
                </div>
            </aside>

            {isDragging && (
                <div className="pointer-events-none absolute inset-0 border-4 border-dashed border-[#ff1654] bg-[#ff1654]/10" />
            )}
        </div>
    );
}
