import { useMemo, useEffect, useState } from 'react';

interface OutcomeState {
    state: string;
    weight?: number;
}

type TimeGranularity = 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

interface TimeRNGBaseOptions {
    // Seed offset for variation (can be a number or string)
    seedOffset?: number | string;

    // Time granularity for snapping (default: 'day')
    granularity?: TimeGranularity;
}

interface TimeRNGNumberOptions extends TimeRNGBaseOptions {
    min?: number;
    max?: number;
}

interface TimeRNGStateOptions extends TimeRNGBaseOptions {
    outcomes: OutcomeState[];
}

/**
 * Get the milliseconds for a given time granularity
 */
function getGranularityMs(granularity: TimeGranularity): number {
    switch (granularity) {
        case 'day': return 24 * 60 * 60 * 1000;
        case 'hour': return 60 * 60 * 1000;
        case 'minute': return 60 * 1000;
        case 'second': return 1000;
        case 'millisecond': return 1;
    }
}

/**
 * Snap a timestamp to the start of the given granularity period in UTC
 */
function snapToGranularity(timestamp: number, granularity: TimeGranularity): number {
    const date = new Date(timestamp);

    switch (granularity) {
        case 'day':
            return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        case 'hour':
            return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours());
        case 'minute':
            return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
                date.getUTCHours(), date.getUTCMinutes());
        case 'second':
            return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
                date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
        case 'millisecond':
            return timestamp;
    }
}

/**
 * Shared seeded random number generator based on UTC time
 * Uses a combination of LCG and bit mixing for better distribution
 * @param seedOffset - Optional offset to vary the seed (number or string)
 * @param granularity - Time granularity for snapping (default: 'day')
 * @returns A random number between 0 and 1
 */
function useTimeBasedRandom(
    seedOffset: number | string = 0,
    granularity: TimeGranularity = 'day'
): number {
    const [tick, setTick] = useState(0);

    // Check for granularity changes at a reasonable interval
    const checkInterval = Math.max(100, getGranularityMs(granularity) / 2);

    useEffect(() => {
        const timer = setInterval(() => {
            setTick(prev => prev + 1);
        }, checkInterval);

        return () => clearInterval(timer);
    }, [checkInterval]);

    return useMemo(() => {
        const now = Date.now();
        const snappedTime = snapToGranularity(now, granularity);

        // Hash string to number if needed
        const numericSeed = typeof seedOffset === 'string'
            ? seedOffset.split('').reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0)
            : seedOffset;

        let seed = snappedTime + numericSeed;

        // Bit mixing for better distribution
        seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b);
        seed = Math.imul(seed ^ (seed >>> 13), 0xc2b2ae35);
        seed ^= seed >>> 16;

        // LCG
        const value = (Math.imul(1664525, Math.abs(seed)) + 1013904223) >>> 0;
        return value / 0x100000000;
    }, [seedOffset, granularity, tick]);
}

/**
 * Hook that provides a random number in a specified range based on UTC time
 * @param options - Configuration with min, max, seedOffset, and granularity
 * @returns A number in the range [min, max]
 */
export function useTimeRNGNumber(options: TimeRNGNumberOptions = {}): number {
    const {
        min = 0,
        max = 1,
        seedOffset = 0,
        granularity = 'day',
    } = options;

    const random = useTimeBasedRandom(seedOffset, granularity);

    return useMemo(() => {
        return min + random * (max - min);
    }, [min, max, random]);
}

/**
 * Hook that provides a weighted random state based on UTC time
 * @param options - Configuration with outcomes array, seedOffset, and granularity
 * @returns A state string from the outcomes array
 */
export function useTimeRNGState(options: TimeRNGStateOptions): string {
    const {
        outcomes,
        seedOffset = 0,
        granularity = 'day',
    } = options;

    const random = useTimeBasedRandom(seedOffset, granularity);

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
