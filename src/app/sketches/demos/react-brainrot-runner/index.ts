"use client";

/**
 * React Brainrot Runner
 * 
 * An infinite runner game library built with React Three Fiber.
 * Designed to load fast, and easy to customize for use in loading screens or mini-games.
 * 
 * @example
 * ```tsx
 * import RunnerGame from 'react-brainrot-runner';
 * 
 * function App() {
 *   return <RunnerGame />;
 * }
 * ```
 */

// Main game component
export { default  } from './game';

// Core components for customization
export { default as Player } from './Player';
export { default as Room } from './rooms/BaseRoom';

// Types for library consumers
export type RoomVariant = {
    wallColor?: string;
    floorColor?: string;
    width?: number;
    length?: number;
    wallHeight?: number;
    height?: number;
};

// Re-export commonly needed utilities
export type { default as Game } from './game';
