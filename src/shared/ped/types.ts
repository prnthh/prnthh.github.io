import React, { RefObject } from "react";
import { AnimationAction, Group, Object3D, Vector3 } from "three";
import { IntersectionEnterHandler, RapierRigidBody } from "@react-three/rapier";

// =============================================================================
// BASE TYPES - Used by HumanoidModel (animated character without physics)
// =============================================================================

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
    model: string;
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
    /** React children */
    children?: React.ReactNode;
}

// =============================================================================
// PHYSICS TYPES - Used by RigidHumanoidModel (character with physics body)
// =============================================================================

/**
 * Extended ref for humanoid models with physics rigidbody.
 * Provides access to both animation controls and physics body.
 */
export interface RigidHumanoidModelRef extends AnimatedModelRef {
    /** Reference to the Rapier physics rigidbody */
    rigidBodyRef: RefObject<RapierRigidBody | null>;
}

/**
 * Props for a humanoid character model with physics.
 * Uses a capsule collider for character controller-style movement.
 */
export interface RigidHumanoidModelProps extends AnimatedModelProps {
    /** World position of the character [x, y, z] */
    position?: [number, number, number];
    /** Radius of the rounded caps on the capsule collider */
    capsuleRadius?: number;
    /** Callback when the capsule collider detects an intersection (sensor mode) */
    onCollisionEnter?: IntersectionEnterHandler;
}

// =============================================================================
// PED TYPES - Used by Ped (full pedestrian with steering and ragdoll)
// =============================================================================

/**
 * A pedestrian (ped) character with physics, steering, and optional ragdoll on hit.
 * Combines a rigid humanoid model with steering behaviors and ragdoll death mechanics.
 */
export interface PedProps extends RigidHumanoidModelProps {
    /** World position of the ped [x, y, z] */
    position?: [number, number, number];
    /** Callback when ped reaches their navigation destination */
    onDestinationReached?: () => void;
    /** If true, ped will detect bullet collisions and ragdoll on hit */
    enableRagdollOnHit?: boolean;
    /** Externally force ragdoll state (useful for scripted deaths or networking) */
    forceRagdoll?: boolean;
    /** Expose internal refs to parent component */
    forwardRef?: (refs: RigidHumanoidModelRef) => void;
    /** Callback when the ped is hit by a bullet */
    onBulletHit?: () => void;
}

