"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Prefab, PrefabEditor, PrefabEditorRef } from "react-three-game";
import { LoadingManager, Material, Object3D, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import PixelationEffect from "../../demos/homepage/PixelationEffect";

type SupportedAssetType = "gltf" | "bin" | "png";

type AssetSlots = Partial<Record<SupportedAssetType, File>>;

const ASSET_CONFIG: Array<{ type: SupportedAssetType; label: string; accept: string }> = [
    { type: "gltf", label: "GLTF", accept: ".gltf" },
    { type: "bin", label: "BIN", accept: ".bin" },
    { type: "png", label: "PNG", accept: ".png" },
];

const DEFAULT_ASSET_BASE = "/models/environment/picocad/tablet";
const EDITOR_MODEL_PATH = "imports/picocad-tablet.gltf";
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

function getFileExtension(filename: string): SupportedAssetType | null {
    const extension = filename.toLowerCase().split(".").pop();

    if (extension === "gltf" || extension === "bin" || extension === "png") {
        return extension;
    }

    return null;
}

function normalizeLookupKey(value: string) {
    const withoutQuery = value.split(/[?#]/)[0].replace(/\\/g, "/");

    try {
        return decodeURIComponent(withoutQuery).toLowerCase();
    } catch {
        return withoutQuery.toLowerCase();
    }
}

function getFilename(value: string) {
    const normalized = normalizeLookupKey(value);
    const parts = normalized.split("/");
    return parts[parts.length - 1] ?? normalized;
}

function mergeSupportedFiles(files: File[], currentAssets: AssetSlots) {
    const nextAssets = { ...currentAssets };

    files.forEach(file => {
        const type = getFileExtension(file.name);

        if (!type) {
            return;
        }

        nextAssets[type] = file;
    });

    return nextAssets;
}

function getPrimarySceneAsset(assets: AssetSlots) {
    return assets.gltf ?? null;
}

function getAssetByReference(assets: AssetSlots, value: string) {
    const referenceName = getFilename(value);

    return Object.values(assets).find(file => {
        if (!file) {
            return false;
        }

        return file.name.toLowerCase() === referenceName;
    }) ?? null;
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

async function loadDefaultAssets() {
    const entries = await Promise.all(
        ASSET_CONFIG.map(async config => {
            const response = await fetch(`${DEFAULT_ASSET_BASE}.${config.type}`);

            if (!response.ok) {
                throw new Error(`Failed to load default ${config.label} asset.`);
            }

            const blob = await response.blob();
            const filename = `tablet.${config.type}`;

            return [
                config.type,
                new File([blob], filename, { type: blob.type || "application/octet-stream" }),
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
    const [pixelationEnabled, setPixelationEnabled] = useState(true);
    const [editorReady, setEditorReady] = useState(false);
    const editorRef = useRef<PrefabEditorRef | null>(null);
    const fileInputRefs = useRef<Record<SupportedAssetType, HTMLInputElement | null>>({
        gltf: null,
        bin: null,
        png: null,
    });

    const primarySceneAsset = useMemo(() => getPrimarySceneAsset(assets), [assets]);
    const exportFilename = primarySceneAsset
        ? `${primarySceneAsset.name.replace(/\.[^.]+$/, "")}.glb`
        : "picocad-export.glb";
    const editorModelPath = primarySceneAsset ? `imports/${primarySceneAsset.name}` : EDITOR_MODEL_PATH;
    const handleEditorRef = useCallback((value: PrefabEditorRef | null) => {
        editorRef.current = value;
        if (value) {
            setEditorReady(true);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        loadDefaultAssets()
            .then(defaultAssets => {
                if (cancelled) {
                    return;
                }

                setAssets(previousAssets => {
                    if (previousAssets.gltf || previousAssets.bin || previousAssets.png) {
                        return previousAssets;
                    }

                    return defaultAssets;
                });
            })
            .catch(error => {
                if (cancelled) {
                    return;
                }

                console.error(error);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (loadedScene) {
                disposeObject(loadedScene);
            }
        };
    }, [loadedScene]);

    useEffect(() => {
        const sceneAsset = getPrimarySceneAsset(assets);

        if (!sceneAsset) {
            setIsLoading(false);
            setLoadError(null);
            setLoadedScene(previousScene => {
                if (previousScene) {
                    disposeObject(previousScene);
                }

                return null;
            });
            return;
        }

        const manager = new LoadingManager();
        const objectUrls = new Map<string, string>();
        let cancelled = false;

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
            const normalized = normalizeLookupKey(url);
            const fileAsset = getAssetByReference(assets, normalized);

            if (!fileAsset) {
                return url;
            }

            return getObjectUrl(fileAsset);
        });

        setIsLoading(true);
        setLoadError(null);
        setExportError(null);

        const loader = new GLTFLoader(manager);

        loader.loadAsync(getObjectUrl(sceneAsset))
            .then(gltf => {
                if (cancelled) {
                    disposeObject(gltf.scene);
                    return;
                }

                setLoadedScene(previousScene => {
                    if (previousScene) {
                        disposeObject(previousScene);
                    }

                    return gltf.scene;
                });
            })
            .catch(error => {
                if (cancelled) {
                    return;
                }

                setLoadedScene(previousScene => {
                    if (previousScene) {
                        disposeObject(previousScene);
                    }

                    return null;
                });
                setLoadError(error instanceof Error ? error.message : "Failed to assemble dropped assets.");
            })
            .finally(() => {
                objectUrls.forEach(url => URL.revokeObjectURL(url));

                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
            objectUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [assets]);

    useEffect(() => {
        const editor = editorRef.current;

        if (!editorReady || !editor) {
            return;
        }

        if (!loadedScene) {
            editor.replacePrefab(EMPTY_PREFAB);
            return;
        }

        const sceneName = primarySceneAsset?.name.replace(/\.[^.]+$/, "") || "Picocad Model";

        editor.replacePrefab({
            ...EMPTY_PREFAB,
            name: sceneName,
        });
        const node = editor.addModel(editorModelPath, loadedScene, {
            name: sceneName,
            parentId: "root",
            select: false,
        });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                editor.rootRef.current?.focusNode(node.id);
            });
        });
    }, [editorModelPath, editorReady, loadedScene, primarySceneAsset]);

    function addFiles(files: File[]) {
        setAssets(previousAssets => mergeSupportedFiles(files, previousAssets));
    }

    function handleTypedInputChange(type: SupportedAssetType, event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (file) {
            setAssets(previousAssets => ({
                ...previousAssets,
                [type]: file,
            }));
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

    function openFilePicker(type: SupportedAssetType) {
        fileInputRefs.current[type]?.click();
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

    return (
        <div
            className="noscrollbar relative grid h-screen grid-cols-1 overflow-x-hidden overflow-y-auto bg-[#8f84b0] font-bold text-[#ffd5e8] lg:h-auto lg:min-h-screen lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-y-visible"
            style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
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
                    {pixelationEnabled && (
                        <PixelationEffect pixelSize={6} normalEdgeStrength={0.3} depthEdgeStrength={0.4} />
                    )}
                </PrefabEditor>
            </main>

            <aside className="border-t-4 border-[#24315d] bg-[#7b2154] text-[#ffb1cf] lg:border-t-0 lg:border-l-4">
                <div className="flex h-full w-full flex-col items-center bg-[#7b2154] text-[#ffb1cf]">
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
                                Drop your picoCAD files anywhere, or add them here.
                            </p>
                        </div>

                        <div className="w-full max-w-[320px] space-y-3 bg-[#7b2154] p-4">
                            <div className="flex items-center justify-between pb-3">
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffd5e8]">Assets</h2>
                                <button
                                    className="bg-[#ff89b3] px-4 py-2 text-sm text-[#fff2f4] hover:bg-[#ff94ba]"
                                    type="button"
                                    onClick={clearAssets}
                                >
                                    Clear
                                </button>
                            </div>

                            {ASSET_CONFIG.map(config => {
                                const file = assets[config.type];

                                return (
                                    <div key={config.type} className="flex items-center gap-3 bg-[#8b2b62] px-3 py-3">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <span className="w-12 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd5e8]">
                                                {config.label}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm text-[#fff2f4]">
                                                    {file ? file.name : `No ${config.label.toLowerCase()} file added`}
                                                </p>
                                                <p className="text-xs text-[#f596bd]">
                                                    {file ? `${(file.size / 1024).toFixed(1)} KB` : config.accept}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                className="bg-[#ff89b3] px-3 py-1.5 text-sm text-[#fff2f4] hover:bg-[#ff94ba]"
                                                type="button"
                                                onClick={() => openFilePicker(config.type)}
                                            >
                                                Add
                                            </button>
                                            <span
                                                className={[
                                                    "flex h-8 w-8 items-center justify-center bg-[#7b2154]",
                                                    file ? "text-[#ffe28a]" : "text-[#a33a73]",
                                                ].join(" ")}
                                                aria-label={file ? `${config.label} added` : `${config.label} missing`}
                                            >
                                                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                                                </svg>
                                            </span>
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
                                {loadError ? loadError : isLoading ? "Loading..." : "Waiting for model..."}
                            </div>
                        )}

                        {exportError && <div className="mt-3 text-sm text-[#7b2154]">{exportError}</div>}

                        <p className="mt-4 text-xs leading-5 text-[#f596bd]">
                            Dropping files replaces the existing slot for that file type.
                        </p>


                        <div className="mt-4 w-full max-w-[320px] space-y-3  p-4 border-t-4 border-[#24315d] ">
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffd5e8] w-full text-left">Effects</h2>

                            <label className="mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ffd5e8]">
                                <input
                                    type="checkbox"
                                    checked={pixelationEnabled}
                                    onChange={event => setPixelationEnabled(event.target.checked)}
                                    className="h-4 w-4"
                                />
                                Pixelate
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
