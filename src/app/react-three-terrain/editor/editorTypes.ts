import * as THREE from "three";

export type PaintMode = "height" | "color";
export type BrushShape = "circle" | "square";
export type EditorMode = "play" | "edit";
export type BrushMode = "brush" | "move";

export interface BrushSettings {
    mode: PaintMode;
    size: number;
    shape: BrushShape;
    color: string;
    height: number;
    softness: number;
}

export interface CachedTileImages {
    height: ImageData;
    color: ImageData;
}

export type PreviewHeightDataMap = Map<string, Float32Array | null>;
export type PreviewColorTextureMap = Map<string, THREE.Texture | null>;