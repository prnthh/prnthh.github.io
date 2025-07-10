// DragDropLoader.tsx
import { useEffect, ChangeEvent } from "react";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

interface DragDropLoaderProps {
    onModelLoaded: (model: any, filename: string) => void;
}

// Shared file handling logic
function handleFiles(files: File[], onModelLoaded: (model: any, filename: string) => void) {
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
                        onModelLoaded(gltf.scene, file.name);
                    }, (error) => {
                        console.error("GLTFLoader parse error", error);
                    });
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });
}

export function DragDropLoader({ onModelLoaded }: DragDropLoaderProps) {
    useEffect(() => {
        function handleDrop(e: DragEvent) {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
            handleFiles(files, onModelLoaded);
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

// FilePicker component
interface FilePickerProps {
    onModelLoaded: (model: any, filename: string) => void;
}

export function FilePicker({ onModelLoaded }: FilePickerProps) {
    function onChange(e: ChangeEvent<HTMLInputElement>) {
        const files = e.target.files ? Array.from(e.target.files) : [];
        handleFiles(files, onModelLoaded);
    }
    // Ref for the hidden input
    const inputId = "file-picker-input";
    return (
        <>
            <input
                id={inputId}
                type="file"
                accept=".glb"
                multiple
                onChange={onChange}
                style={{ display: "none" }}
            />
            <button
                className="border rounded px-1"
                type="button"
                onClick={() => document.getElementById(inputId)?.click()}
            >
                Select File
            </button>
        </>
    );
}
