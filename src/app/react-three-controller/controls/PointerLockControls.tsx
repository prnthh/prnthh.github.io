import { useEffect, useRef, useState } from "react";
import useInputStore, { InteractionPriority } from "./InputStore";

const PINCH_ZOOM_STEP = 0.02;

const PointerLockControls = ({
    onLook,
    onClick,
    onZoom,
    onRightClickDown,
    onRightClickUp
}: {
    onLook?: (dx: number, dy: number) => void,
    onClick?: () => void,
    onZoom?: (delta: number) => void,
    onRightClickDown?: () => void,
    onRightClickUp?: () => void
}) => {
    const [isLocked, setIsLocked] = useState(false);
    const lastTouch = useRef<{ id: number; x: number; y: number } | null>(null);
    const isPointerLocked = useRef<boolean>(false);
    const rightClickActive = useRef<boolean>(false);
    const pinchDistance = useRef<number | null>(null);
    const { setButton } = useInputStore();

    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // --- Pointer lock setup ---
        const handleClick = (e: MouseEvent) => {
            // Don't request pointer lock on right-click
            if (e.button === 2 || rightClickActive.current) {
                rightClickActive.current = false;
                return;
            }
            // Only request pointer lock if not already locked
            if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock().catch(() => { });
            }
        };

        const handlePointerLockChange = () => {
            const locked = document.pointerLockElement === canvas;
            setIsLocked(locked);
            isPointerLocked.current = locked;
        };

        canvas.addEventListener('click', handleClick);
        document.addEventListener('pointerlockchange', handlePointerLockChange);

        // --- Mouse button handlers ---
        const onMouseButtonDown = (e: MouseEvent) => {
            // Handle right-click first
            if (e.button === 2) {
                rightClickActive.current = true;
                setButton('aim', true, InteractionPriority.WEAPONS);
                if (onRightClickDown) {
                    onRightClickDown();
                }
                return; // Exit early for right-click
            }

            // Handle left-click (fire button)
            if (e.button === 0 && isPointerLocked.current) {
                setButton('fire', true, InteractionPriority.WEAPONS);
                if (onClick) {
                    onClick();
                }
            }
        };

        const onMouseButtonUp = (e: MouseEvent) => {
            if (e.button === 2) {
                setButton('aim', false);
                if (onRightClickUp) onRightClickUp();
                // Reset right-click state after a short delay to prevent click event
                setTimeout(() => {
                    rightClickActive.current = false;
                }, 10);
            } else if (e.button === 0) {
                setButton('fire', false);
            }
        };

        const onContextMenu = (e: Event) => e.preventDefault();

        canvas.addEventListener("mousedown", onMouseButtonDown);
        canvas.addEventListener("mouseup", onMouseButtonUp);
        canvas.addEventListener("contextmenu", onContextMenu);

        return () => {
            canvas.removeEventListener('click', handleClick);
            document.removeEventListener('pointerlockchange', handlePointerLockChange);
            canvas.removeEventListener("mousedown", onMouseButtonDown);
            canvas.removeEventListener("mouseup", onMouseButtonUp);
            canvas.removeEventListener("contextmenu", onContextMenu);
        };
    }, [onClick, onRightClickDown, onRightClickUp]);

    // Mouse handling
    useEffect(() => {
        if (!onLook || !isLocked) return;

        const handleMouseMove = (e: MouseEvent) => {
            onLook(e.movementX, e.movementY);
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isLocked, onLook]);

    // Touch handling
    useEffect(() => {
        if (!onLook && !onZoom) return;

        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const getTouchDistance = (touches: TouchList) => {
            if (touches.length < 2) return null;
            const firstTouch = touches[0];
            const secondTouch = touches[1];
            return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
        };

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                pinchDistance.current = getTouchDistance(e.touches);
                lastTouch.current = null;
                return;
            }

            if (lastTouch.current !== null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if ((t.target as HTMLElement) === canvas) {
                    lastTouch.current = { id: t.identifier, x: t.clientX, y: t.clientY };
                    break;
                }
            }
        };

        const onTouchMoveHandler = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const nextPinchDistance = getTouchDistance(e.touches);
                if (nextPinchDistance !== null && pinchDistance.current !== null) {
                    onZoom?.((pinchDistance.current - nextPinchDistance) * PINCH_ZOOM_STEP);
                }
                pinchDistance.current = nextPinchDistance;
                return;
            }

            if (!lastTouch.current) return;
            const touch = Array.from(e.touches).find(
                (t) => t.identifier === lastTouch.current!.id && (t.target as HTMLElement) === canvas
            );
            if (!touch) return;
            const dx = touch.clientX - lastTouch.current.x;
            const dy = touch.clientY - lastTouch.current.y;
            // Apply sensitivity multiplier for touch input (touch movements are typically smaller)
            const touchSensitivity = 2.5;
            onLook?.(dx * touchSensitivity, dy * touchSensitivity);
            lastTouch.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                pinchDistance.current = null;
            }
            if (!lastTouch.current) return;
            const ended = Array.from(e.changedTouches).some((t) => t.identifier === lastTouch.current!.id);
            if (ended) {
                lastTouch.current = null;
            }
        };

        const onWheel = (e: WheelEvent) => {
            onZoom?.(e.deltaY > 0 ? 0.75 : -0.75);
        };

        canvas.addEventListener("touchstart", onTouchStart, { passive: true });
        canvas.addEventListener("touchmove", onTouchMoveHandler, { passive: true });
        canvas.addEventListener("touchend", onTouchEnd, { passive: true });
        canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });
        canvas.addEventListener("wheel", onWheel, { passive: true });

        return () => {
            canvas.removeEventListener("touchstart", onTouchStart);
            canvas.removeEventListener("touchmove", onTouchMoveHandler);
            canvas.removeEventListener("touchend", onTouchEnd);
            canvas.removeEventListener("touchcancel", onTouchEnd);
            canvas.removeEventListener("wheel", onWheel);
        };
    }, [onLook, onZoom]);

    return null;
}

export default PointerLockControls;