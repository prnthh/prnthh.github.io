import { useMemo, useEffect, useState } from 'react';

interface OutcomeState {
    state: string;
    weight?: number;
}

interface TimeRNGBaseOptions {
    // Seed offset for variation (can be a number or string)
    seedOffset?: number | string;

    // Refresh interval in milliseconds
    interval?: number;
}

interface TimeRNGNumberOptions extends TimeRNGBaseOptions {
    min?: number;
    max?: number;
}

interface TimeRNGStateOptions extends TimeRNGBaseOptions {
    outcomes: OutcomeState[];
}

/**
 * Shared seeded random number generator based on UTC time
 * Uses a combination of LCG and bit mixing for better distribution
 * @param seedOffset - Optional offset to vary the seed (number or string)
 * @param interval - Time interval for discretization (default 1000ms)
 * @returns A random number between 0 and 1
 */
function useTimeBasedRandom(seedOffset: number | string = 0, interval: number = 1000): number {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTick(prev => prev + 1);
        }, interval);

        return () => clearInterval(timer);
    }, [interval]);

    return useMemo(() => {
        const now = Date.now();
        const discreteTime = Math.floor(now / interval) * interval;

        // Hash string to number if needed
        const numericSeed = typeof seedOffset === 'string'
            ? seedOffset.split('').reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0)
            : seedOffset;

        let seed = discreteTime + numericSeed;

        // Bit mixing for better distribution
        seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b);
        seed = Math.imul(seed ^ (seed >>> 13), 0xc2b2ae35);
        seed ^= seed >>> 16;

        // LCG
        const value = (Math.imul(1664525, Math.abs(seed)) + 1013904223) >>> 0;
        return value / 0x100000000;
    }, [seedOffset, interval, tick]);
}

/**
 * Hook that provides a random number in a specified range based on UTC time
 * @param options - Configuration with min, max, seedOffset, and interval
 * @returns A number in the range [min, max]
 */
export function useTimeRNGNumber(options: TimeRNGNumberOptions = {}): number {
    const {
        min = 0,
        max = 1,
        seedOffset = 0,
        interval = 1000,
    } = options;

    const random = useTimeBasedRandom(seedOffset, interval);

    return useMemo(() => {
        return min + random * (max - min);
    }, [min, max, random]);
}

/**
 * Hook that provides a weighted random state based on UTC time
 * @param options - Configuration with outcomes array, seedOffset, and interval
 * @returns A state string from the outcomes array
 */
export function useTimeRNGState(options: TimeRNGStateOptions): string {
    const {
        outcomes,
        seedOffset = 0,
        interval = 1000,
    } = options;

    const random = useTimeBasedRandom(seedOffset, interval);

    return useMemo(() => {
        if (!outcomes || outcomes.length === 0) {
            return '';
        }

        const totalWeight = outcomes.reduce((sum, outcome) => sum + (outcome.weight ?? 1), 0);
        let randomValue = random * totalWeight;

        for (const outcome of outcomes) {
            const weight = outcome.weight ?? 1;
            if (randomValue < weight) {
                return outcome.state;
            }
            randomValue -= weight;
        }

        // Fallback to first outcome
        return outcomes[0].state;
    }, [outcomes, random]);
}

// Helper function for creating weighted outcomes
export function createOutcome(
    state: string,
    weight: number = 1
): OutcomeState {
    return { state, weight };
}
