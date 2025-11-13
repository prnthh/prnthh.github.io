import { GLTFLoader, FBXLoader, DRACOLoader } from "three/examples/jsm/Addons.js";

export type ModelLoadResult = {
    success: boolean;
    model?: any;
    error?: any;
};

export async function loadModel(
    filename: string,
    resourcePath: string = ""
): Promise<ModelLoadResult> {
    try {
        // Construct full path - always prepend resourcePath if provided (even if empty string)
        // This allows loading from root with resourcePath=""
        const fullPath = `${resourcePath}/${filename}`;

        if (filename.endsWith('.glb') || filename.endsWith('.gltf')) {
            const loader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
            loader.setDRACOLoader(dracoLoader);

            return new Promise((resolve) => {
                loader.load(
                    fullPath,
                    (gltf) => resolve({ success: true, model: gltf.scene }),
                    undefined,
                    (error) => resolve({ success: false, error })
                );
            });
        } else if (filename.endsWith('.fbx')) {
            const loader = new FBXLoader();

            return new Promise((resolve) => {
                loader.load(
                    fullPath,
                    (model) => resolve({ success: true, model }),
                    undefined,
                    (error) => resolve({ success: false, error })
                );
            });
        } else {
            return { success: false, error: new Error(`Unsupported file format: ${filename}`) };
        }
    } catch (error) {
        return { success: false, error };
    }
}
