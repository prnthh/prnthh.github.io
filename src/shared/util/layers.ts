/**
 * Three.js camera/object layer assignments.
 *
 * The default R3F camera only renders layer 0, so any object moved to a
 * higher-numbered layer is automatically hidden from the player's view.
 * Shadow cameras must explicitly enable any non-zero layer they should see.
 *
 * Usage:
 *   mesh.layers.set(LAYER_SHADOW_ONLY)   // hide from camera, keep in shadow map
 *   camera.layers.enable(LAYER_DYNAMIC)  // let camera see dynamic layer too
 */

/** Default – visible to camera and included in shadow maps. */
export const LAYER_DEFAULT = 0;

/**
 * Shadow-only – invisible to the player camera but included in shadow maps.
 * Use for first-person player meshes so they cast shadows without being seen.
 * Shadow lights must call `shadowCamera.layers.enable(LAYER_SHADOW_ONLY)`.
 */
export const LAYER_SHADOW_ONLY = 1;

/**
 * Static geometry – buildings, terrain, props that never move.
 * Useful for optimising shadow map updates (only re-render when dirty).
 */
export const LAYER_STATIC = 2;
