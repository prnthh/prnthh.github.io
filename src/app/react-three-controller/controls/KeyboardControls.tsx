'use client';

import { useEffect } from 'react';
import useInputStore from './InputStore';

// Keyboard to controller mapping
const keyMapping = {
    // Movement
    KeyW: { axis: 'vertical' as const, value: 1 },
    KeyS: { axis: 'vertical' as const, value: -1 },
    KeyA: { axis: 'horizontal' as const, value: -1 },
    KeyD: { axis: 'horizontal' as const, value: 1 },
    KeyQ: { button: 'use' as const },
    KeyE: { button: 'altUse' as const },

    // Look
    ArrowUp: { axis: 'lookVertical' as const, value: 1 },
    ArrowDown: { axis: 'lookVertical' as const, value: -1 },
    ArrowLeft: { axis: 'lookHorizontal' as const, value: -1 },
    ArrowRight: { axis: 'lookHorizontal' as const, value: 1 },

    // Buttons
    Space: { button: 'jump' as const },
    ShiftLeft: { button: 'sprint' as const },
    ShiftRight: { button: 'sprint' as const },
};

type AxisName = 'horizontal' | 'vertical' | 'lookHorizontal' | 'lookVertical';

export default function KeyboardInput() {
    useEffect(() => {
        const pressedKeys = new Set<string>();
        const axisValues = new Map<AxisName, number>();

        const updateAxis = (axis: AxisName) => {
            let value = 0;

            // Check all pressed keys that affect this axis
            for (const key of pressedKeys) {
                const mapping = keyMapping[key as keyof typeof keyMapping];
                if (mapping && 'axis' in mapping && mapping.axis === axis) {
                    value += mapping.value;
                }
            }

            // Clamp between -1 and 1
            value = Math.max(-1, Math.min(1, value));
            axisValues.set(axis, value);
            useInputStore.getState().setAxis(axis, value);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.code;
            if (!(key in keyMapping)) return;

            if (pressedKeys.has(key)) return; // Already pressed
            pressedKeys.add(key);

            const mapping = keyMapping[key as keyof typeof keyMapping];

            if ('axis' in mapping) {
                updateAxis(mapping.axis);
            } else if ('button' in mapping) {
                useInputStore.getState().setButton(mapping.button, true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.code;
            if (!(key in keyMapping)) return;

            pressedKeys.delete(key);

            const mapping = keyMapping[key as keyof typeof keyMapping];

            if ('axis' in mapping) {
                updateAxis(mapping.axis);
            } else if ('button' in mapping) {
                useInputStore.getState().setButton(mapping.button, false);
            }
        };

        const handleBlur = () => {
            // Reset all inputs when window loses focus
            pressedKeys.clear();
            axisValues.clear();
            const store = useInputStore.getState();
            store.setAxis('horizontal', 0);
            store.setAxis('vertical', 0);
            store.setAxis('lookHorizontal', 0);
            store.setAxis('lookVertical', 0);
            store.setButton('jump', false);
            store.setButton('sprint', false);
            store.setButton('use', false);
            store.setButton('altUse', false);
            store.setButton('aim', false);
            store.setButton('fire', false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    return null;
}
