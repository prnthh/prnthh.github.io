'use client';

import { create } from 'zustand';

/**
 * Unified Input & Interaction System
 *
 * Combines input state management with Unity-style interaction priorities.
 * Allows interactive elements (UI, buttons, NPCs) to claim input priority
 * and prevent lower-priority systems (weapons, movement) from receiving input.
 *
 * Priority levels (higher number = higher priority):
 * - UI: 100 (modals, menus)
 * - Interactive Objects: 50 (buttons, levers, doors)
 * - World Interactions: 25 (NPCs, pickups)
 * - Weapons: 10 (shooting, aiming)
 * - Default: 0 (movement, look)
 */

export enum InteractionPriority {
  DEFAULT = 0,
  WEAPONS = 10,
  WORLD_INTERACTIONS = 25,
  INTERACTIVE_OBJECTS = 50,
  UI = 100,
}

interface InteractionClaim {
  id: string;
  priority: InteractionPriority;
  blocksInput: string[]; // Which inputs to block: 'fire', 'use', 'all', etc.
  timestamp: number;
}

// ==================== INTERACTION MANAGER ====================

class InteractionManagerClass {
  private claims: Map<string, InteractionClaim> = new Map();

  /**
   * Register an interaction claim
   * @param id Unique identifier for this claim
   * @param priority Priority level
   * @param blocksInput Array of input keys to block (e.g., ['fire', 'use']) or ['all']
   */
  claim(id: string, priority: InteractionPriority, blocksInput: string[] = ['all']): void {
    this.claims.set(id, {
      id,
      priority,
      blocksInput,
      timestamp: Date.now(),
    });
  }

  /**
   * Release an interaction claim
   */
  release(id: string): void {
    this.claims.delete(id);
  }

  /**
   * Check if an input is blocked by a higher priority interaction
   * @param inputKey The input to check (e.g., 'fire', 'use')
   * @param requesterPriority Priority of the system requesting input
   */
  isInputBlocked(inputKey: string, requesterPriority: InteractionPriority = InteractionPriority.DEFAULT): boolean {
    for (const claim of this.claims.values()) {
      // Skip claims with lower or equal priority
      if (claim.priority <= requesterPriority) continue;

      // Check if this claim blocks all inputs or this specific input
      if (claim.blocksInput.includes('all') || claim.blocksInput.includes(inputKey)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the highest priority claim currently active
   */
  getHighestPriorityClaim(): InteractionClaim | null {
    let highest: InteractionClaim | null = null;
    for (const claim of this.claims.values()) {
      if (!highest || claim.priority > highest.priority) {
        highest = claim;
      }
    }
    return highest;
  }

  /**
   * Clear all claims (useful for cleanup/reset)
   */
  clearAll(): void {
    this.claims.clear();
  }

  /**
   * Debug: Get all active claims
   */
  getActiveClaims(): InteractionClaim[] {
    return Array.from(this.claims.values());
  }
}

// Singleton instance
export const InteractionManager = new InteractionManagerClass();

// ==================== INPUT STATE ====================

interface InputState {
  // Joystick axes (all range from -1 to 1)
  horizontal: number;
  vertical: number;
  lookHorizontal: number;
  lookVertical: number;

  // Button states
  jump: boolean;
  sprint: boolean;
  use: boolean;
  altUse: boolean;
  aim: boolean;
  fire: boolean;

  // Tap/Swipe signals (for mobile)
  tapSignal: number;
  swipeSignal: { type: 'left' | 'right'; timestamp: number } | null;

  // Actions to update state
  setAxis: (axis: keyof Omit<InputState, 'jump' | 'sprint' | 'use' | 'altUse' | 'tapSignal' | 'swipeSignal' | 'setAxis' | 'setButton' | 'tap' | 'swipe' | 'canSetButton'>, value: number) => void;
  setButton: (button: 'jump' | 'sprint' | 'use' | 'altUse' | 'aim' | 'fire', pressed: boolean, priority?: InteractionPriority) => void;
  tap: () => void;
  swipe: (type: 'left' | 'right') => void;
  canSetButton: (button: 'jump' | 'sprint' | 'use' | 'altUse' | 'aim' | 'fire', priority?: InteractionPriority) => boolean;
}

const useInputStore = create<InputState>((set) => ({
  // Initial values
  horizontal: 0,
  vertical: 0,
  lookHorizontal: 0,
  lookVertical: 0,
  jump: false,
  sprint: false,
  use: false,
  altUse: false,
  aim: false,
  fire: false,
  tapSignal: 0,
  swipeSignal: null,

  // Actions
  setAxis: (axis, value) => set({ [axis]: Math.max(-1, Math.min(1, value)) }),
  setButton: (button, pressed, priority = InteractionPriority.DEFAULT) => {
    // Check if input is blocked by higher priority interaction
    if (InteractionManager.isInputBlocked(button, priority)) {
      return; // Don't set the button if blocked
    }
    set({ [button]: pressed });
  },
  canSetButton: (button, priority = InteractionPriority.DEFAULT) => {
    return !InteractionManager.isInputBlocked(button, priority);
  },
  tap: () => set((state) => ({ tapSignal: state.tapSignal + 1 })),
  swipe: (type) => set({ swipeSignal: { type, timestamp: Date.now() } }),
}));

export default useInputStore;
