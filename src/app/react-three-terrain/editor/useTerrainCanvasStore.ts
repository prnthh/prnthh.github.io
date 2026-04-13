"use client";

import { useCallback, useRef } from "react";
import { PaintMode } from "./editorTypes";

type CanvasRefs = {
    height: HTMLCanvasElement | null;
    color: HTMLCanvasElement | null;
};

type UseTerrainCanvasStoreParams = {
    paintMode: PaintMode;
};

export type TerrainCanvasContexts = {
    height: CanvasRenderingContext2D;
    color: CanvasRenderingContext2D;
};

export function useTerrainCanvasStore({
    paintMode,
}: UseTerrainCanvasStoreParams) {
    const heightCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const colorCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const heightContextRef = useRef<CanvasRenderingContext2D | null>(null);
    const colorContextRef = useRef<CanvasRenderingContext2D | null>(null);

    const getOrCreateContext = useCallback((kind: keyof CanvasRefs) => {
        const canvasRef = kind === "height" ? heightCanvasRef : colorCanvasRef;
        const contextRef = kind === "height" ? heightContextRef : colorContextRef;

        if (!canvasRef.current) {
            contextRef.current = null;
            return null;
        }

        if (!contextRef.current || contextRef.current.canvas !== canvasRef.current) {
            contextRef.current = canvasRef.current.getContext("2d", { willReadFrequently: true });
        }

        return contextRef.current;
    }, []);

    const getCanvasContexts = useCallback((): TerrainCanvasContexts | null => {
        const height = getOrCreateContext("height");
        const color = getOrCreateContext("color");
        return height && color ? { height, color } : null;
    }, [getOrCreateContext]);

    const getActiveContext = useCallback(() => {
        return getOrCreateContext(paintMode);
    }, [getOrCreateContext, paintMode]);

    const setCanvasRefs = useCallback((refs: CanvasRefs) => {
        heightCanvasRef.current = refs.height;
        colorCanvasRef.current = refs.color;
        if (heightContextRef.current?.canvas !== refs.height) heightContextRef.current = null;
        if (colorContextRef.current?.canvas !== refs.color) colorContextRef.current = null;
    }, []);

    return {
        getCanvasContexts,
        getActiveContext,
        setCanvasRefs,
    };
}