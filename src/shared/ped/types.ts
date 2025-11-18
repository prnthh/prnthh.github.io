import React, {  RefObject  } from "react";
import { AnimationAction, Group, Object3D, Vector3 } from "three";

export interface AnimatedModelRef extends Object3D {
    setAnimation: (animation: string | string[]) => void;
    groupRef: RefObject<Group>;
    modelRef: RefObject<Object3D | undefined>;
}

export interface AnimatedModelProps {
    name?: string,
    model: string;
    basePath?: string,
    animation?: string | string[], // <-- allow string or array
    height?: number,
    animationOverrides?: { [key: string]: string },
    position?: [number, number, number],
    scale?: number
    rotation?: [number, number, number],
    modelOffset?: [number, number, number],
    debug?: boolean, onClick?: (e?: any) => void,
    lookTarget?: RefObject<Object3D | null>
    retargetOptions?: { boneMap?: Record<string, string>, preserveHipPosition?: boolean }
    onActions?: (actions: { [key: string]: AnimationAction }) => void
    attachments?: { [key: string]: { model: string, attachpoint: string, offset: Vector3, scale: Vector3, rotation: Vector3 } },
    enableBoneCollider?: boolean, // Add option to disable BoneCollider
    children?: React.ReactNode;
}

