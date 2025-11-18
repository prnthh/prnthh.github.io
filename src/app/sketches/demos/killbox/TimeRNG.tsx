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
        case 'day': return 86400000; // Pre-computed: 24 * 60 * 60 * 1000
        case 'hour': return 3600000; // Pre-computed: 60 * 60 * 1000
        case 'minute': return 60000; // Pre-computed: 60 * 1000
        case 'second': return 1000;
        case 'millisecond': return 1;
    }
}

/**
 * Snap a timestamp to the start of the given granularity period in UTC
 * Optimized for performance with direct math operations
 */
function snapToGranularity(timestamp: number, granularity: TimeGranularity): number {
    const granMs = getGranularityMs(granularity);
    return Math.floor(timestamp / granMs) * granMs;
}

/**
 * Pure function that generates a random number based on UTC time
 * Simple, fast, and consistent across platforms
 * @param seedOffset - Optional offset to vary the seed (number or string)
 * @param granularity - Time granularity for snapping (default: 'day')
 * @returns A random number between 0 and 1
 */
export function getTimeBasedRandom(
    seedOffset: number | string = 0,
    granularity: TimeGranularity = 'day'
): number {
    const now = Date.now();
    const snappedTime = snapToGranularity(now, granularity);

    // Simple string hash
    const numericSeed = typeof seedOffset === 'string'
        ? seedOffset.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
        : seedOffset | 0;

    // Simple hash with good distribution
    let h = (snappedTime + numericSeed) | 0;
    h = (h ^ (h >>> 16)) * 0x85ebca6b;
    h = (h ^ (h >>> 13)) * 0xc2b2ae35;
    h = (h ^ (h >>> 16)) >>> 0;

    return h / 4294967296; // 0x100000000
}

/**
 * Shared seeded random number generator based on UTC time
 * @param seedOffset - Optional offset to vary the seed (number or string)
 * @param granularity - Time granularity for snapping (default: 'day')
 * @returns A random number between 0 and 1
 */
function useTimeBasedRandom(
    seedOffset: number | string = 0,
    granularity: TimeGranularity = 'day'
): number {
    const [tick, setTick] = useState(0);

    const granMs = getGranularityMs(granularity);
    const checkInterval = granMs > 200 ? granMs / 2 : 100;

    useEffect(() => {
        const timer = setInterval(() => {
            setTick(prev => prev + 1);
        }, checkInterval);

        return () => clearInterval(timer);
    }, [checkInterval]);

    return useMemo(() => {
        return getTimeBasedRandom(seedOffset, granularity);
    }, [seedOffset, granularity, tick]);
}

/**
 * Pure function that provides a random number in a specified range based on UTC time
 * @param options - Configuration with min, max, seedOffset, and granularity
 * @returns A number in the range [min, max]
 */
export function getTimeRNGNumber(options: TimeRNGNumberOptions = {}): number {
    const {
        min = 0,
        max = 1,
        seedOffset = 0,
        granularity = 'day',
    } = options;

    const random = getTimeBasedRandom(seedOffset, granularity);
    return min + random * (max - min);
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
 * Pure function that provides a weighted random state based on UTC time
 * @param options - Configuration with outcomes array, seedOffset, and granularity
 * @returns A state string from the outcomes array
 */
export function getTimeRNGState(options: TimeRNGStateOptions): string {
    const {
        outcomes,
        seedOffset = 0,
        granularity = 'day',
    } = options;

    const random = getTimeBasedRandom(seedOffset, granularity);

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
