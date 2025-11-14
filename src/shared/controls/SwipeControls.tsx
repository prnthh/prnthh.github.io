import { useEffect, useRef } from "react";

const SwipeControls = ({
    onSwipeLeft,
    onSwipeRight,
    onTap,
    swipeThreshold = 50,
    tapMaxDuration = 200,
    tapMaxMovement = 10
}: {
    onSwipeLeft?: () => void,
    onSwipeRight?: () => void,
    onTap?: () => void,
    swipeThreshold?: number,
    tapMaxDuration?: number,
    tapMaxMovement?: number
}) => {
    const interactionStart = useRef<{ x: number; y: number; time: number } | null>(null);
    const isMouseDown = useRef(false);

    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const handleGestureEnd = (x: number, y: number) => {
            if (!interactionStart.current) return;

            const deltaX = x - interactionStart.current.x;
            const deltaY = y - interactionStart.current.y;
            const deltaTime = Date.now() - interactionStart.current.time;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Check if it's a tap (short duration, minimal movement)
            if (deltaTime < tapMaxDuration && distance < tapMaxMovement) {
                if (onTap) {
                    onTap();
                }
            } else {
                // Check for swipe gestures
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);

                // Horizontal swipe is dominant
                if (absX > absY && absX > swipeThreshold) {
                    if (deltaX > 0 && onSwipeRight) {
                        onSwipeRight();
                    } else if (deltaX < 0 && onSwipeLeft) {
                        onSwipeLeft();
                    }
                }
            }

            interactionStart.current = null;
        };

        // Touch events
        const onTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            if (!touch) return;

            interactionStart.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
            };
        };

        const onTouchEnd = (e: TouchEvent) => {
            const touch = e.changedTouches[0];
            if (!touch) return;
            handleGestureEnd(touch.clientX, touch.clientY);
        };

        const onTouchCancel = () => {
            interactionStart.current = null;
        };

        // Mouse events
        const onMouseDown = (e: MouseEvent) => {
            isMouseDown.current = true;
            interactionStart.current = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now()
            };
        };

        const onMouseUp = (e: MouseEvent) => {
            if (!isMouseDown.current) return;
            isMouseDown.current = false;
            handleGestureEnd(e.clientX, e.clientY);
        };

        const onMouseLeave = () => {
            if (isMouseDown.current) {
                isMouseDown.current = false;
                interactionStart.current = null;
            }
        };

        // Touch listeners with passive flag for better performance
        canvas.addEventListener("touchstart", onTouchStart, { passive: true });
        canvas.addEventListener("touchend", onTouchEnd, { passive: true });
        canvas.addEventListener("touchcancel", onTouchCancel, { passive: true });

        // Mouse listeners
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("mouseleave", onMouseLeave);

        return () => {
            canvas.removeEventListener("touchstart", onTouchStart);
            canvas.removeEventListener("touchend", onTouchEnd);
            canvas.removeEventListener("touchcancel", onTouchCancel);
            canvas.removeEventListener("mousedown", onMouseDown);
            canvas.removeEventListener("mouseup", onMouseUp);
            canvas.removeEventListener("mouseleave", onMouseLeave);
        };
    }, [onSwipeLeft, onSwipeRight, onTap, swipeThreshold, tapMaxDuration, tapMaxMovement]);

    return null;
}

export default SwipeControls;
