import { useRef, useEffect, useState } from "react";
import { MathUtils } from "three";
import { degToRad } from "three/src/math/MathUtils.js";

export function usePointerLockControls({enabled = true}: { enabled?: boolean } = {}) {
    const rotationTarget = useRef<number>(0);
    const verticalRotation = useRef<number>(0);
    const [shoulderCamMode, setShoulderCamMode] = useState(false);
    const isPointerLocked = useRef<boolean>(false);

    // Track last touch position for mobile dragging
    const lastTouch = useRef<{ id: number; x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas || !enabled) return;

        const onMouseDown = (e: MouseEvent | TouchEvent) => {
            if (e instanceof MouseEvent && e.target instanceof HTMLElement) {
                e.target.requestPointerLock?.();
            }
        };
        const onMouseMove = (e: MouseEvent) => {
            if (!isPointerLocked.current) return;
            const deltaX = e.movementX;
            const deltaY = e.movementY;
            rotationTarget.current -= deltaX * 0.005;
            verticalRotation.current = MathUtils.clamp(
                verticalRotation.current + deltaY * 0.005,
                degToRad(-85),
                degToRad(85)
            );
        };
        const onPointerLockChange = () => {
            isPointerLocked.current = document.pointerLockElement !== null;
        };
        const onMouseButtonChange = (e: MouseEvent) => {
            if (e.button === 2) {
                setShoulderCamMode(e.type === 'mousedown');
            }
        };

        // --- Touch event handlers for mobile drag ---
        const onTouchStart = (e: TouchEvent) => {
            if (lastTouch.current === null) {
                // Only start tracking if the touch started on the canvas
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if ((touch.target as HTMLElement) === canvas) {
                        lastTouch.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
                        break;
                    }
                }
            }
            // else: ignore new touches if already tracking one (prevents hijacking multitouch)
        };
        const onTouchMove = (e: TouchEvent) => {
            if (lastTouch.current) {
                // Only process move for the tracked touch identifier
                const touch = Array.from(e.touches).find(
                    t => t.identifier === lastTouch.current!.id && (t.target as HTMLElement) === canvas
                );
                if (touch) {
                    const deltaX = touch.clientX - lastTouch.current.x;
                    const deltaY = touch.clientY - lastTouch.current.y;
                    rotationTarget.current -= deltaX * 0.005;
                    verticalRotation.current = MathUtils.clamp(
                        verticalRotation.current + deltaY * 0.005,
                        degToRad(-85),
                        degToRad(85)
                    );
                    lastTouch.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
                }
            }
        };
        const onTouchEnd = (e: TouchEvent) => {
            if (lastTouch.current) {
                // If the tracked touch ended, clear it (do not switch to another active touch)
                const ended = Array.from(e.changedTouches).some(t => t.identifier === lastTouch.current!.id);
                if (ended) {
                    lastTouch.current = null;
                }
            }
        };

        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mousemove", onMouseMove);
        document.addEventListener("pointerlockchange", onPointerLockChange);
        canvas.addEventListener("touchstart", onMouseDown);
        canvas.addEventListener("mousedown", onMouseButtonChange);
        canvas.addEventListener("mouseup", onMouseButtonChange);
        canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        // Add touch drag listeners
        canvas.addEventListener("touchstart", onTouchStart);
        canvas.addEventListener("touchmove", onTouchMove);
        canvas.addEventListener("touchend", onTouchEnd);

        return () => {
            canvas.removeEventListener("mousedown", onMouseDown);
            canvas.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("pointerlockchange", onPointerLockChange);
            canvas.removeEventListener("touchstart", onMouseDown);
            canvas.removeEventListener("mousedown", onMouseButtonChange);
            canvas.removeEventListener("mouseup", onMouseButtonChange);
            canvas.removeEventListener("contextmenu", (e) => e.preventDefault());

            // Remove touch drag listeners
            canvas.removeEventListener("touchstart", onTouchStart);
            canvas.removeEventListener("touchmove", onTouchMove);
            canvas.removeEventListener("touchend", onTouchEnd);
        };
    }, [enabled]);

    return { rotationTarget, verticalRotation, shoulderCamMode, setShoulderCamMode };
}
