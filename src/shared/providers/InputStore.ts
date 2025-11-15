'use client';

import { create } from 'zustand';

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
  
  // Tap/Swipe signals (for mobile)
  tapSignal: number;
  swipeSignal: { type: 'left' | 'right'; timestamp: number } | null;
  
  // Actions to update state
  setAxis: (axis: keyof Omit<InputState, 'jump' | 'sprint' | 'use' | 'altUse' | 'tapSignal' | 'swipeSignal' | 'setAxis' | 'setButton' | 'tap' | 'swipe'>, value: number) => void;
  setButton: (button: 'jump' | 'sprint' | 'use' | 'altUse', pressed: boolean) => void;
  tap: () => void;
  swipe: (type: 'left' | 'right') => void;
}

export const useInputStore = create<InputState>((set) => ({
  // Initial values
  horizontal: 0,
  vertical: 0,
  lookHorizontal: 0,
  lookVertical: 0,
  jump: false,
  sprint: false,
  use: false,
  altUse: false,
  tapSignal: 0,
  swipeSignal: null,
  
  // Actions
  setAxis: (axis, value) => set({ [axis]: Math.max(-1, Math.min(1, value)) }),
  setButton: (button, pressed) => set({ [button]: pressed }),
  tap: () => set((state) => ({ tapSignal: state.tapSignal + 1 })),
  swipe: (type) => set({ swipeSignal: { type, timestamp: Date.now() } }),
}));
