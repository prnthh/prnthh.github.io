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
  
  // Actions to update state
  setAxis: (axis: keyof Omit<InputState, 'jump' | 'sprint' | 'setAxis' | 'setButton'>, value: number) => void;
  setButton: (button: 'jump' | 'sprint', pressed: boolean) => void;
}

export const useInputStore = create<InputState>((set) => ({
  // Initial values
  horizontal: 0,
  vertical: 0,
  lookHorizontal: 0,
  lookVertical: 0,
  jump: false,
  sprint: false,
  
  // Actions
  setAxis: (axis, value) => set({ [axis]: Math.max(-1, Math.min(1, value)) }),
  setButton: (button, pressed) => set({ [button]: pressed }),
}));
