import { Texture, TextureLoader } from "three";
import { DRACOLoader, FBXLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

export type LoadedModel = any;
export type LoadedTexture = Texture;

export type ModelLoadResult = {
    success: boolean;
    model?: LoadedModel;
    error?: unknown;
};

export type TextureLoadResult = {
    success: boolean;
    texture?: LoadedTexture;
    error?: unknown;
};

export type ProgressCallback = (filename: string, loaded: number, total: number) => void;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const fbxLoader = new FBXLoader();
const textureLoader = new TextureLoader();

function isModelFile(name: string) {
    const normalizedName = name.toLowerCase();
    return normalizedName.endsWith(".glb") || normalizedName.endsWith(".gltf") || normalizedName.endsWith(".fbx");
}

export function canParseModelFile(file: File) {
    return isModelFile(file.name);
}

export function canParseTextureFile(file: File) {
    const normalizedName = file.name.toLowerCase();
    return normalizedName.endsWith(".png")
        || normalizedName.endsWith(".jpg")
        || normalizedName.endsWith(".jpeg")
        || normalizedName.endsWith(".webp")
        || normalizedName.endsWith(".gif")
        || normalizedName.endsWith(".bmp")
        || normalizedName.endsWith(".svg");
}

export function parseModelFromFile(file: File): Promise<ModelLoadResult> {
    return new Promise(resolve => {
        const reader = new FileReader();

        reader.onload = event => {
            const arrayBuffer = event.target?.result as ArrayBuffer;

            if (!arrayBuffer) {
                resolve({ success: false, error: new Error("Failed to read file") });
                return;
            }

            const name = file.name.toLowerCase();

            if (name.endsWith(".glb") || name.endsWith(".gltf")) {
                gltfLoader.parse(
                    arrayBuffer,
                    "",
                    gltf => {
                        resolve({ success: true, model: gltf.scene });
                    },
                    error => {
                        resolve({ success: false, error });
                    },
                );
                return;
            }

            if (name.endsWith(".fbx")) {
                try {
                    const model = fbxLoader.parse(arrayBuffer, "");
                    resolve({ success: true, model });
                } catch (error) {
                    resolve({ success: false, error });
                }
                return;
            }

            resolve({ success: false, error: new Error(`Unsupported file format: ${file.name}`) });
        };

        reader.onerror = () => resolve({ success: false, error: reader.error });
        reader.readAsArrayBuffer(file);
    });
}

export function parseTextureFromFile(file: File): Promise<TextureLoadResult> {
    return new Promise(resolve => {
        const objectUrl = URL.createObjectURL(file);

        textureLoader.load(
            objectUrl,
            texture => {
                URL.revokeObjectURL(objectUrl);
                resolve({ success: true, texture });
            },
            undefined,
            error => {
                URL.revokeObjectURL(objectUrl);
                resolve({ success: false, error });
            },
        );
    });
}

export async function loadModel(
    filename: string,
    onProgress?: ProgressCallback,
): Promise<ModelLoadResult> {
    try {
        const fullPath = filename;

        if (filename.endsWith(".glb") || filename.endsWith(".gltf")) {
            return new Promise(resolve => {
                gltfLoader.load(
                    fullPath,
                    gltf => resolve({ success: true, model: gltf.scene }),
                    progressEvent => {
                        if (!onProgress) {
                            return;
                        }

                        const total = progressEvent.total || progressEvent.loaded;
                        onProgress(filename, progressEvent.loaded, total);
                    },
                    error => resolve({ success: false, error }),
                );
            });
        }

        if (filename.endsWith(".fbx")) {
            return new Promise(resolve => {
                fbxLoader.load(
                    fullPath,
                    model => resolve({ success: true, model }),
                    progressEvent => {
                        if (!onProgress) {
                            return;
                        }

                        const total = progressEvent.total || progressEvent.loaded;
                        onProgress(filename, progressEvent.loaded, total);
                    },
                    error => resolve({ success: false, error }),
                );
            });
        }

        return { success: false, error: new Error(`Unsupported file format: ${filename}`) };
    } catch (error) {
        return { success: false, error };
    }
}