/**
 * react-three-controller
 *
 * A comprehensive input and interaction system for React Three Fiber applications.
 * Provides Unity-style interaction priorities, first/third person controls, and more.
 */

// Core Input System
export { default as useInputStore, InteractionManager, InteractionPriority } from './controls/InputStore';
export type { default as InputStore } from './controls/InputStore';

// Controls
export { default as ControlsProvider } from './controls/ControlsProvider';
export { default as PointerLockControls } from './controls/PointerLockControls';
export { default as KeyboardControls } from './controls/KeyboardControls';
export { default as TouchscreenControls } from './controls/TouchscreenControls';

// Controllers
export { default as NeoControls } from './neo/NeoControls';
export { NeoController } from './neo/NeoController';

// Weapon System
export { Weapon } from './Weapon';

// Ped System
export { default as Ped } from './ped/ped';
export { default as ModelAttachment } from '../react-three-character/ModelAttachment';
export { default as useLookAtTarget } from '../react-three-character/useLookAtTarget';
export { default as useAnimationStateBasic } from '../react-three-character/useAnimationStateBasic';

// Ped Physics
export { default as Ragdoll } from './ped/physics/Ragdoll';
export { default as PedRagdoll } from './ped/physics/PedRagdoll';
export { default as RigidHumanoidModel } from './ped/physics/RigidHumanoidModel';
export { default as SelfSteeringBehavior } from './ped/physics/SelfSteeringBehavior';

// Navigation
export { NavigableAgent } from './navmesh/NavigableAgent';
export { NavigableContextProvider, useNavigableContext } from './navmesh/NavigableContext';

// Types
export type * from '../react-three-character/types';
export type * from './ped/types';
