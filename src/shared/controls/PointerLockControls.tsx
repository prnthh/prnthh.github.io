import { useEffect, useRef, useState } from "react";

const PointerLockControls = ({
    onLook,
    onClick,
    shoulderCamMode,
    onShoulderCamModeChange
}: {
    onLook?: (dx: number, dy: number) => void,
    onClick?: () => void,
    shoulderCamMode?: boolean,
    onShoulderCamModeChange?: (mode: boolean) => void
}) => {
    const [isLocked, setIsLocked] = useState(false);
    const lastTouch = useRef<{ id: number; x: number; y: number } | null>(null);
    const isPointerLocked = useRef<boolean>(false);

    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // --- Pointer lock setup ---
        const handleClick = () => {
            canvas.requestPointerLock();
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
            if (onClick && e.button === 0) onClick();
            if (e.button === 2 && onShoulderCamModeChange) onShoulderCamModeChange(true);
        };

        const onMouseButtonUp = (e: MouseEvent) => {
            if (e.button === 2 && onShoulderCamModeChange) onShoulderCamModeChange(false);
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
    }, [onClick, onShoulderCamModeChange]);

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
        if (!onLook) return;

        const canvas = document.querySelector('canvas');
        if (!canvas) return;

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

        const onTouchMoveHandler = (e: TouchEvent) => {
            if (!lastTouch.current) return;
            const touch = Array.from(e.touches).find(
                (t) => t.identifier === lastTouch.current!.id && (t.target as HTMLElement) === canvas
            );
            if (!touch) return;
            const dx = touch.clientX - lastTouch.current.x;
            const dy = touch.clientY - lastTouch.current.y;
            onLook(dx, dy);
            lastTouch.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (!lastTouch.current) return;
            const ended = Array.from(e.changedTouches).some((t) => t.identifier === lastTouch.current!.id);
            if (ended) {
                lastTouch.current = null;
            }
        };

        canvas.addEventListener("touchstart", onTouchStart);
        canvas.addEventListener("touchmove", onTouchMoveHandler);
        canvas.addEventListener("touchend", onTouchEnd);

        return () => {
            canvas.removeEventListener("touchstart", onTouchStart);
            canvas.removeEventListener("touchmove", onTouchMoveHandler);
            canvas.removeEventListener("touchend", onTouchEnd);
        };
    }, [onLook]);

    return null;
}

export default PointerLockControls;