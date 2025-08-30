/**
 * Copyright (c) prnth.com. All rights reserved.
 *
 * This source code is licensed under the GPL-3.0 license
 */

import { useRef, useEffect, useState } from "react";
import { MathUtils } from "three";
import { degToRad } from "three/src/math/MathUtils.js";

export function usePointerLockControls({ enabled = true, onClick }: { enabled?: boolean, onClick?: () => void } = {}) {
    const rotationTarget = useRef<number>(0);
    const verticalRotation = useRef<number>(0);
    const [shoulderCamMode, setShoulderCamMode] = useState(false);
    const isPointerLocked = useRef<boolean>(false);

    // Track last touch position for mobile dragging
    const lastTouch = useRef<{ id: number; x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas || !enabled) return;

        // Sensitivity and clamp constants
        const H_SENS = 0.005;
        const V_SENS = 0.005;
        const MAX_VRAD = degToRad(85);
        const MIN_VRAD = degToRad(-85);

        const applyDelta = (dx: number, dy: number) => {
            rotationTarget.current -= dx * H_SENS;
            verticalRotation.current = MathUtils.clamp(
                verticalRotation.current + dy * V_SENS,
                MIN_VRAD,
                MAX_VRAD
            );
        };

        // --- Mouse handlers ---
        const onMouseDownRequest = (e: MouseEvent) => {
            // Only request pointer lock for primary button
            if (e.button === 0 && e.target instanceof HTMLElement) {
                e.target.requestPointerLock?.();
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isPointerLocked.current) return;
            applyDelta(e.movementX, e.movementY);
        };

        const onPointerLockChange = () => {
            isPointerLocked.current = document.pointerLockElement !== null;
        };

        const onMouseButtonDown = (e: MouseEvent) => {
            if (onClick && e.button === 0) onClick();
            if (e.button === 2) setShoulderCamMode(true);
        };

        const onMouseButtonUp = (e: MouseEvent) => {
            if (e.button === 2) setShoulderCamMode(false);
        };

        const onContextMenu = (e: Event) => e.preventDefault();

        // --- Touch handlers ---
        const onTouchStart = (e: TouchEvent) => {
            if (lastTouch.current !== null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if ((t.target as HTMLElement) === canvas) {
                    lastTouch.current = { id: t.identifier, x: t.clientX, y: t.clientY };
                    break;
                }
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!lastTouch.current) return;
            const touch = Array.from(e.touches).find(
                (t) => t.identifier === lastTouch.current!.id && (t.target as HTMLElement) === canvas
            );
            if (!touch) return;
            const dx = touch.clientX - lastTouch.current.x;
            const dy = touch.clientY - lastTouch.current.y;
            applyDelta(dx, dy);
            lastTouch.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (!lastTouch.current) return;
            const ended = Array.from(e.changedTouches).some((t) => t.identifier === lastTouch.current!.id);
            if (ended) lastTouch.current = null;
        };

        // Add listeners (use named handlers so we can remove them cleanly)
        canvas.addEventListener("mousedown", onMouseDownRequest);
        canvas.addEventListener("mousemove", onMouseMove);
        document.addEventListener("pointerlockchange", onPointerLockChange);
        canvas.addEventListener("mousedown", onMouseButtonDown);
        canvas.addEventListener("mouseup", onMouseButtonUp);
        canvas.addEventListener("contextmenu", onContextMenu);

        canvas.addEventListener("touchstart", onTouchStart);
        canvas.addEventListener("touchmove", onTouchMove);
        canvas.addEventListener("touchend", onTouchEnd);

        return () => {
            canvas.removeEventListener("mousedown", onMouseDownRequest);
            canvas.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("pointerlockchange", onPointerLockChange);
            canvas.removeEventListener("mousedown", onMouseButtonDown);
            canvas.removeEventListener("mouseup", onMouseButtonUp);
            canvas.removeEventListener("contextmenu", onContextMenu);

            canvas.removeEventListener("touchstart", onTouchStart);
            canvas.removeEventListener("touchmove", onTouchMove);
            canvas.removeEventListener("touchend", onTouchEnd);
        };
    }, [enabled]);

    return { rotationTarget, verticalRotation, shoulderCamMode, setShoulderCamMode };
}
