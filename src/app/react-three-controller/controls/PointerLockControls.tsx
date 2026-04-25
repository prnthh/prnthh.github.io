import { useEffect, useRef, useState } from "react";
import useInputStore, { InteractionPriority } from "./InputStore";

const PINCH_ZOOM_STEP = 0.02;

const PointerLockControls = ({
    onLook,
    onClick,
    onClickUp,
    onZoom,
    onRightClickDown,
    onRightClickUp
}: {
    onLook?: (dx: number, dy: number) => void,
    onClick?: () => void,
    onClickUp?: () => void,
    onZoom?: (delta: number) => void,
    onRightClickDown?: () => void,
    onRightClickUp?: () => void
}) => {
    const [isLocked, setIsLocked] = useState(false);
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const lastTouch = useRef<{ id: number; x: number; y: number } | null>(null);
    const isPointerLocked = useRef<boolean>(false);
    const rightClickActive = useRef<boolean>(false);
    const pinchDistance = useRef<number | null>(null);
    const pinchTouchIds = useRef<[number, number] | null>(null);
    const { setButton } = useInputStore();

    useEffect(() => {
        const existingCanvas = document.querySelector("canvas");
        if (existingCanvas instanceof HTMLCanvasElement) {
            setCanvas(existingCanvas);
            return;
        }

        const observer = new MutationObserver(() => {
            const nextCanvas = document.querySelector("canvas");
            if (!(nextCanvas instanceof HTMLCanvasElement)) {
                return;
            }

            setCanvas(nextCanvas);
            observer.disconnect();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
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
            const isCanvasEvent = e.target === canvas;
            if (!isPointerLocked.current && !isCanvasEvent) {
                return;
            }

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
            if (!isPointerLocked.current && e.target !== canvas) {
                return;
            }

            if (e.button === 2) {
                setButton('aim', false);
                if (onRightClickUp) onRightClickUp();
                // Reset right-click state after a short delay to prevent click event
                setTimeout(() => {
                    rightClickActive.current = false;
                }, 10);
            } else if (e.button === 0) {
                setButton('fire', false);
                if (onClickUp) {
                    onClickUp();
                }
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
    }, [canvas, onClick, onClickUp, onRightClickDown, onRightClickUp]);

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

        if (!canvas) return;

        const isCanvasTouch = (touch: Touch) => (touch.target as HTMLElement) === canvas;

        const getCanvasTouches = (touches: TouchList) => Array.from(touches).filter(isCanvasTouch);

        const getTouchDistance = (touches: TouchList) => {
            if (touches.length < 2) return null;
            const firstTouch = touches[0];
            const secondTouch = touches[1];
            return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
        };

        const onTouchStart = (e: TouchEvent) => {
            const canvasTouches = getCanvasTouches(e.touches);
            if (canvasTouches.length >= 2) {
                pinchTouchIds.current = [canvasTouches[0].identifier, canvasTouches[1].identifier];
                pinchDistance.current = getTouchDistance({
                    0: canvasTouches[0],
                    1: canvasTouches[1],
                    length: 2,
                    item: (index: number) => canvasTouches[index] ?? null,
                    [Symbol.iterator]: function* () {
                        yield canvasTouches[0];
                        yield canvasTouches[1];
                    },
                } as TouchList);
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
            const canvasTouches = getCanvasTouches(e.touches);
            const activePinchTouches = pinchTouchIds.current
                ? canvasTouches.filter((touch) => pinchTouchIds.current?.includes(touch.identifier))
                : [];

            if (activePinchTouches.length === 2) {
                const nextPinchDistance = getTouchDistance({
                    0: activePinchTouches[0],
                    1: activePinchTouches[1],
                    length: 2,
                    item: (index: number) => activePinchTouches[index] ?? null,
                    [Symbol.iterator]: function* () {
                        yield activePinchTouches[0];
                        yield activePinchTouches[1];
                    },
                } as TouchList);
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
            const canvasTouches = getCanvasTouches(e.touches);
            const hasActivePinchTouches = pinchTouchIds.current
                ? canvasTouches.filter((touch) => pinchTouchIds.current?.includes(touch.identifier)).length === 2
                : false;

            if (!hasActivePinchTouches) {
                pinchDistance.current = null;
                pinchTouchIds.current = null;
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
    }, [canvas, onLook, onZoom]);

    return null;
}

export default PointerLockControls;