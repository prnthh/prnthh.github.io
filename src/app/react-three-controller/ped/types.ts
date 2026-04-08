import { RefObject } from "react";
import { IntersectionEnterHandler, RapierRigidBody } from "@react-three/rapier";
import type { AnimatedModelProps, AnimatedModelRef } from "../../react-three-character/types";

export type { AnimatedModelProps, AnimatedModelRef } from "../../react-three-character/types";

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

