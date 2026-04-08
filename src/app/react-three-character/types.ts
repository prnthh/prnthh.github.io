import React, { RefObject } from "react";
import { AnimationAction, Group, Object3D, Vector3 } from "three";

/**
 * Ref for animated humanoid models.
 * Provides access to animation controls and internal refs.
 */
export interface AnimatedModelRef extends Object3D {
    /** Change the current animation (single or blended) */
    setAnimation: (animation: string | string[]) => void;
    /** Reference to the outer group containing the model */
    groupRef: RefObject<Group>;
    /** Reference to the loaded model object */
    modelRef: RefObject<Object3D | undefined>;
}

/**
 * Props for an animated humanoid model.
 * Handles loading, animation, and rendering of rigged characters.
 */
export interface AnimatedModelProps {
    /** Unique name identifier for the model */
    name?: string;
    /** Path to the .glb model file (relative to basePath) */
    model?: string;
    /** Base path for model assets */
    basePath?: string;
    /** Current animation name or array for blending */
    animation?: string | string[];
    /** Character height in world units (used for scaling) */
    height?: number;
    /** Override default animation file paths { animName: "path/to/anim.fbx" } */
    animationOverrides?: { [key: string]: string };
    /** World position [x, y, z] */
    position?: [number, number, number];
    /** Uniform scale factor */
    scale?: number;
    /** Rotation in radians [x, y, z] */
    rotation?: [number, number, number];
    /** Offset applied to the model within its container */
    modelOffset?: [number, number, number];
    /** Enable debug visualization */
    debug?: boolean;
    /** Click handler */
    onClick?: (e?: any) => void;
    /** Target for head/neck look-at behavior */
    lookTarget?: RefObject<Object3D | null>;
    /** Options for animation retargeting */
    retargetOptions?: { boneMap?: Record<string, string>; preserveHipPosition?: boolean };
    /** Callback when animation actions are ready */
    onActions?: (actions: { [key: string]: AnimationAction }) => void;
    /** Model attachments (weapons, accessories, etc.) */
    attachments?: {
        [key: string]: {
            model: string;
            attachpoint: string;
            offset: Vector3;
            scale: Vector3;
            rotation: Vector3;
        };
    };
    /** Enable bone-based collision detection */
    enableBoneCollider?: boolean;
    /** When true, the model is invisible but still casts shadows (e.g. first-person mode) */
    shadowOnly?: boolean;
    /** React children */
    children?: React.ReactNode;
}