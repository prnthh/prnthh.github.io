import { useEffect, useRef } from "react";

const SwipeControls = ({
    onSwipeLeft,
    onSwipeRight,
    onTap,
    swipeThreshold = 50,
    tapMaxDuration = 200,
    tapMaxMovement = 10,
    scrollThreshold = 500
}: {
    onSwipeLeft?: () => void,
    onSwipeRight?: () => void,
    onTap?: () => void,
    swipeThreshold?: number,
    tapMaxDuration?: number,
    tapMaxMovement?: number,
    scrollThreshold?: number
}) => {
    const interactionStart = useRef<{ x: number; y: number; time: number } | null>(null);
    const isMouseDown = useRef(false);
    const swipeFired = useRef(false);
    const scrollAccumulator = useRef(0);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const checkSwipe = (x: number, y: number) => {
            if (!interactionStart.current || swipeFired.current) return;

            const deltaX = x - interactionStart.current.x;
            const deltaY = y - interactionStart.current.y;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // Fire swipe as soon as threshold is met
            if (absX > absY && absX > swipeThreshold) {
                swipeFired.current = true;
                if (deltaX > 0 && onSwipeRight) {
                    onSwipeRight();
                } else if (deltaX < 0 && onSwipeLeft) {
                    onSwipeLeft();
                }
            }
        };

        const handleGestureEnd = (x: number, y: number) => {
            if (!interactionStart.current) return;

            const deltaX = x - interactionStart.current.x;
            const deltaY = y - interactionStart.current.y;
            const deltaTime = Date.now() - interactionStart.current.time;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Check if it's a tap (short duration, minimal movement, no swipe fired)
            if (!swipeFired.current && deltaTime < tapMaxDuration && distance < tapMaxMovement) {
                if (onTap) {
                    onTap();
                }
            }

            interactionStart.current = null;
            swipeFired.current = false;
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
            swipeFired.current = false;
        };

        const onTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            if (!touch) return;
            checkSwipe(touch.clientX, touch.clientY);
        };

        const onTouchEnd = (e: TouchEvent) => {
            const touch = e.changedTouches[0];
            if (!touch) return;
            handleGestureEnd(touch.clientX, touch.clientY);
        };

        const onTouchCancel = () => {
            interactionStart.current = null;
            swipeFired.current = false;
        };

        // Mouse events
        const onMouseDown = (e: MouseEvent) => {
            isMouseDown.current = true;
            interactionStart.current = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now()
            };
            swipeFired.current = false;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isMouseDown.current) return;
            checkSwipe(e.clientX, e.clientY);
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
                swipeFired.current = false;
            }
        };

        // Scroll event
        const onWheel = (e: WheelEvent) => {
            // Accumulate scroll delta
            scrollAccumulator.current += Math.abs(e.deltaY);

            // Clear existing timeout
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }

            // Check if accumulated scroll meets threshold to trigger tap
            if (scrollAccumulator.current >= scrollThreshold) {
                if (onTap) {
                    onTap();
                }
                scrollAccumulator.current = 0;
            } else {
                // Reset accumulator after a short delay if threshold not met
                scrollTimeout.current = setTimeout(() => {
                    scrollAccumulator.current = 0;
                }, 150);
            }
        };

        // Touch listeners with passive flag for better performance
        canvas.addEventListener("touchstart", onTouchStart, { passive: true });
        canvas.addEventListener("touchmove", onTouchMove, { passive: true });
        canvas.addEventListener("touchend", onTouchEnd, { passive: true });
        canvas.addEventListener("touchcancel", onTouchCancel, { passive: true });

        // Mouse listeners
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("mouseleave", onMouseLeave);

        // Scroll listener
        canvas.addEventListener("wheel", onWheel, { passive: true });

        return () => {
            canvas.removeEventListener("touchstart", onTouchStart);
            canvas.removeEventListener("touchmove", onTouchMove);
            canvas.removeEventListener("touchend", onTouchEnd);
            canvas.removeEventListener("touchcancel", onTouchCancel);
            canvas.removeEventListener("mousedown", onMouseDown);
            canvas.removeEventListener("mousemove", onMouseMove);
            canvas.removeEventListener("mouseup", onMouseUp);
            canvas.removeEventListener("mouseleave", onMouseLeave);
            canvas.removeEventListener("wheel", onWheel);

            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, [onSwipeLeft, onSwipeRight, onTap, swipeThreshold, tapMaxDuration, tapMaxMovement]);

    return null;
}

export default SwipeControls;
