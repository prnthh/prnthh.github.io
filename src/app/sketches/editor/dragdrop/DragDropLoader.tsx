// DragDropLoader.tsx
import { useEffect } from "react";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

interface DragDropLoaderProps {
    onModelLoaded: (model: any) => void;
}

export function DragDropLoader({ onModelLoaded }: DragDropLoaderProps) {
    useEffect(() => {
        function handleDrop(e: DragEvent) {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
            files.forEach((file) => {
                if (file.name.endsWith(".glb")) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const arrayBuffer = event.target?.result;
                        if (arrayBuffer) {
                            const loader = new GLTFLoader();
                            const dracoLoader = new DRACOLoader();
                            dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
                            loader.setDRACOLoader(dracoLoader);
                            loader.parse(arrayBuffer as ArrayBuffer, "", (gltf) => {
                                onModelLoaded(gltf.scene);
                            }, (error) => {
                                console.error("GLTFLoader parse error", error);
                            });
                        }
                    };
                    reader.readAsArrayBuffer(file);
                }
            });
        }
        function handleDragOver(e: DragEvent) {
            e.preventDefault();
            e.stopPropagation();
        }
        window.addEventListener("drop", handleDrop);
        window.addEventListener("dragover", handleDragOver);
        return () => {
            window.removeEventListener("drop", handleDrop);
            window.removeEventListener("dragover", handleDragOver);
        };
    }, [onModelLoaded]);
    return null;
}
