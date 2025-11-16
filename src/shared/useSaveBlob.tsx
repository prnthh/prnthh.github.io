import { useState, useEffect, useCallback } from 'react';

interface BlobData<T> {
    value: T;
    timestamp: number;
}

interface UseSaveBlobOptions<T> {
    blobId: string;
    initialValue: T;
    appId?: string;
}

export function useSaveBlob<T>({
    blobId,
    initialValue,
    appId = 'default-app',
}: UseSaveBlobOptions<T>) {
    const storageKey = `${appId}:${blobId}`;

    // Track the in-memory state with timestamp
    const [data, setData] = useState<BlobData<T>>(() => {
        // Try to load from localStorage on mount
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as BlobData<T>;
                // Validate that we have both value and timestamp
                if (parsed && typeof parsed.timestamp === 'number') {
                    return parsed;
                }
            }
        } catch (error) {
            console.error(`Failed to load blob ${blobId}:`, error);
        }
        // Return initial value with current timestamp
        return {
            value: initialValue,
            timestamp: Date.now(),
        };
    });

    // Update the value and persist to localStorage
    const setValue = useCallback(
        (newValue: T | ((prev: T) => T)) => {
            setData((prevData) => {
                const resolvedValue =
                    typeof newValue === 'function'
                        ? (newValue as (prev: T) => T)(prevData.value)
                        : newValue;

                const timestamp = Date.now();
                const newData: BlobData<T> = {
                    value: resolvedValue,
                    timestamp,
                };

                // Update in-memory timestamp
                // No need to track separately - it's in the state

                // Persist to localStorage
                try {
                    localStorage.setItem(storageKey, JSON.stringify(newData));
                } catch (error) {
                    console.error(`Failed to save blob ${blobId}:`, error);
                }

                return newData;
            });
        },
        [storageKey, blobId]
    );

    // Reconcile state with localStorage on mount and when storage changes
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            // Only handle changes to our specific key
            if (e.key !== storageKey) return;

            try {
                const newValue = e.newValue;
                if (!newValue) return;

                const parsed = JSON.parse(newValue) as BlobData<T>;

                // Only update if the localStorage version is newer than our in-memory version
                if (parsed.timestamp > data.timestamp) {
                    setData(parsed);
                }
            } catch (error) {
                console.error(`Failed to reconcile blob ${blobId}:`, error);
            }
        };

        // Listen for storage events from other tabs/windows
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [storageKey, blobId, data.timestamp]);

    // Expose the current value and setter
    return [data.value, setValue, data.timestamp] as const;
}
