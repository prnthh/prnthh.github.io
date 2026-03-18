"use client";

import { createContext, ReactNode, useContext, useRef, useState } from "react";
import LoadingSpinner from "../../sketches/loading/loading";

const CanvasReadyContext = createContext<(() => void) | null>(null);

/** Call this hook inside the canvas tree to dismiss the loading spinner. */
export function useCanvasReady() {
    const onReady = useContext(CanvasReadyContext);
    const called = useRef(false);
    if (!called.current && onReady) {
        called.current = true;
        onReady();
    }
}

export default function GameWithLoader({ children }: { children: ReactNode }) {
    const [isCanvasReady, setIsCanvasReady] = useState(false);

    return (
        <CanvasReadyContext.Provider value={() => setIsCanvasReady(true)}>
            {!isCanvasReady && <LoadingSpinner />}
            {children}
        </CanvasReadyContext.Provider>
    );
}
