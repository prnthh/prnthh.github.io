'use client';

import * as React from 'react';
import { createStore, StoreApi, useStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

type State = object;
type StateSelector<T extends State, U> = (state: T) => U;
type EqualityChecker<T> = (state: T, newState: T) => boolean;
type StateListener<T> = (state: T, previousState: T) => void;

type StoreApiWithSubscribeWithSelector<T extends State> = Omit<StoreApi<T>, 'subscribe'> & {
    subscribe: {
        (listener: StateListener<T>): () => void;
        <StateSlice>(
            selector: StateSelector<T, StateSlice>,
            listener: StateListener<StateSlice>,
            options?: {
                equalityFn?: EqualityChecker<StateSlice>;
                fireImmediately?: boolean;
            }
        ): () => void;
    };
};

// Combined state that includes both boolean keys and ranged joysticks
export type InputControlsState<
    TKey extends string = string,
    TJoystick extends string = string
> = {
    keys: {
        [K in TKey]: boolean;
    };
    joysticks: {
        [J in TJoystick]: number;
    };
};

export type KeyboardControlsEntry<T extends string = string> = {
    name: T;
    keys: string[];
    up?: boolean;
};

export type JoystickControlEntry<T extends string = string> = {
    name: T;
    keys: [string, string]; // [negative key, positive key] e.g., ['ArrowLeft', 'ArrowRight']
    smoothing?: number; // Optional smoothing factor (0-1), higher = smoother
};

export type InputControlsProps<
    TKey extends string = string,
    TJoystick extends string = string
> = {
    map: KeyboardControlsEntry<TKey>[];
    joysticks?: JoystickControlEntry<TJoystick>[];
    children: React.ReactNode;
    onChange?: (
        name: string,
        value: boolean | number,
        state: InputControlsState<TKey, TJoystick>
    ) => void;
    domElement?: HTMLElement;
};

const InputControlsContext = React.createContext<StoreApiWithSubscribeWithSelector<
    InputControlsState<any, any>
> | null>(null);

export function InputControls<
    TKey extends string = string,
    TJoystick extends string = string
>({
    map,
    joysticks = [],
    children,
    onChange,
    domElement,
}: InputControlsProps<TKey, TJoystick>): React.JSX.Element {
    const storeRef = React.useRef<StoreApiWithSubscribeWithSelector<
        InputControlsState<TKey, TJoystick>
    > | null>(null);

    const keyMapRef = React.useRef<Map<string, { name: TKey; up?: boolean }>>(new Map());
    const joystickMapRef = React.useRef<
        Map<
            string,
            { name: TJoystick; direction: 'negative' | 'positive'; smoothing: number }
        >
    >(new Map());

    // Initialize store
    if (!storeRef.current) {
        // Build initial state
        const initialKeys = {} as { [K in TKey]: boolean };
        const initialJoysticks = {} as { [J in TJoystick]: number };

        map.forEach((entry) => {
            initialKeys[entry.name as TKey] = false;
            entry.keys.forEach((key) => {
                keyMapRef.current.set(key, { name: entry.name, up: entry.up });
            });
        });

        joysticks.forEach((entry) => {
            initialJoysticks[entry.name as TJoystick] = 0;
            const smoothing = entry.smoothing ?? 0.2;
            joystickMapRef.current.set(entry.keys[0], {
                name: entry.name,
                direction: 'negative',
                smoothing,
            });
            joystickMapRef.current.set(entry.keys[1], {
                name: entry.name,
                direction: 'positive',
                smoothing,
            });
        });

        storeRef.current = createStore(
            subscribeWithSelector(() => ({
                keys: initialKeys,
                joysticks: initialJoysticks,
            }))
        );
    }

    const store = storeRef.current;

    // Track pressed joystick keys for interpolation
    const joystickPressedRef = React.useRef<Map<TJoystick, Set<'negative' | 'positive'>>>(
        new Map()
    );

    // Animation frame for smooth joystick updates
    const animationFrameRef = React.useRef<number | null>(null);

    const updateJoysticks = React.useCallback(() => {
        const state = store.getState();
        let needsUpdate = false;
        const newJoysticks = { ...state.joysticks };

        joysticks.forEach((entry) => {
            const pressed = joystickPressedRef.current.get(entry.name) || new Set();
            const smoothing = entry.smoothing ?? 0.2;

            let targetValue = 0;
            if (pressed.has('positive')) targetValue += 1;
            if (pressed.has('negative')) targetValue -= 1;

            const currentValue = state.joysticks[entry.name];
            const diff = targetValue - currentValue;

            if (Math.abs(diff) > 0.001) {
                // Smooth interpolation
                const newValue = currentValue + diff * smoothing;
                // Clamp to -1, 1 and snap to target when very close
                const clampedValue = Math.max(-1, Math.min(1, newValue));
                const finalValue =
                    Math.abs(targetValue - clampedValue) < 0.01 ? targetValue : clampedValue;

                newJoysticks[entry.name] = finalValue;
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            store.setState({ ...state, joysticks: newJoysticks });
            animationFrameRef.current = requestAnimationFrame(updateJoysticks);
        } else {
            animationFrameRef.current = null;
        }
    }, [store, joysticks]);

    React.useEffect(() => {
        const target = domElement || window;

        const handleKeyDown = (e: KeyboardEvent) => {
            const keyEntry = keyMapRef.current.get(e.key);
            const joystickEntry = joystickMapRef.current.get(e.key);

            if (keyEntry && !keyEntry.up) {
                const state = store.getState();
                if (!state.keys[keyEntry.name]) {
                    const newState = {
                        ...state,
                        keys: { ...state.keys, [keyEntry.name]: true },
                    };
                    store.setState(newState);
                    onChange?.(keyEntry.name, true, newState);
                }
            }

            if (joystickEntry) {
                const pressed =
                    joystickPressedRef.current.get(joystickEntry.name) || new Set();
                if (!pressed.has(joystickEntry.direction)) {
                    pressed.add(joystickEntry.direction);
                    joystickPressedRef.current.set(joystickEntry.name, pressed);

                    // Start animation loop if not already running
                    if (animationFrameRef.current === null) {
                        animationFrameRef.current = requestAnimationFrame(updateJoysticks);
                    }
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const keyEntry = keyMapRef.current.get(e.key);
            const joystickEntry = joystickMapRef.current.get(e.key);

            if (keyEntry) {
                const state = store.getState();
                const shouldUpdate = keyEntry.up ? !state.keys[keyEntry.name] : state.keys[keyEntry.name];

                if (shouldUpdate) {
                    const newValue = keyEntry.up ? true : false;
                    const newState = {
                        ...state,
                        keys: { ...state.keys, [keyEntry.name]: newValue },
                    };
                    store.setState(newState);
                    onChange?.(keyEntry.name, newValue, newState);
                }
            }

            if (joystickEntry) {
                const pressed =
                    joystickPressedRef.current.get(joystickEntry.name) || new Set();
                if (pressed.has(joystickEntry.direction)) {
                    pressed.delete(joystickEntry.direction);
                    joystickPressedRef.current.set(joystickEntry.name, pressed);

                    // Continue animation to smooth back to zero
                    if (animationFrameRef.current === null) {
                        animationFrameRef.current = requestAnimationFrame(updateJoysticks);
                    }
                }
            }
        };

        target.addEventListener('keydown', handleKeyDown as any);
        target.addEventListener('keyup', handleKeyUp as any);

        return () => {
            target.removeEventListener('keydown', handleKeyDown as any);
            target.removeEventListener('keyup', handleKeyUp as any);
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [domElement, onChange, store, updateJoysticks]);

    return (
        <InputControlsContext.Provider value={store}>
            {children}
        </InputControlsContext.Provider>
    );
}

// Hook overloads
export function useInputControls<
    TKey extends string = string,
    TJoystick extends string = string
>(): [
        StoreApiWithSubscribeWithSelector<InputControlsState<TKey, TJoystick>>['subscribe'],
        StoreApiWithSubscribeWithSelector<InputControlsState<TKey, TJoystick>>['getState']
    ];

export function useInputControls<
    TKey extends string = string,
    TJoystick extends string = string,
    TSelected = any
>(
    sel: (state: InputControlsState<TKey, TJoystick>) => TSelected
): TSelected;

export function useInputControls<
    TKey extends string = string,
    TJoystick extends string = string,
    TSelected = any
>(sel?: (state: InputControlsState<TKey, TJoystick>) => TSelected) {
    const store = React.useContext(InputControlsContext);

    if (!store) {
        throw new Error('useInputControls must be used within InputControls provider');
    }

    if (sel) {
        return useStore(store, sel);
    }

    return [store.subscribe, store.getState] as const;
}

// Convenience hooks
export function useKey<TKey extends string = string>(name: TKey): boolean {
    return useInputControls((state) => state.keys[name]);
}

export function useJoystick<TJoystick extends string = string>(
    name: TJoystick
): number {
    return useInputControls((state) => state.joysticks[name]);
}

// Hook to set joystick value directly (for touch/mouse input)
export function useSetJoystick<TJoystick extends string = string>() {
    const store = React.useContext(InputControlsContext);

    if (!store) {
        throw new Error('useSetJoystick must be used within InputControls provider');
    }

    return React.useCallback(
        (name: TJoystick, value: number) => {
            const state = store.getState();
            const clampedValue = Math.max(-1, Math.min(1, value));
            store.setState({
                ...state,
                joysticks: { ...state.joysticks, [name]: clampedValue },
            });
        },
        [store]
    );
}
