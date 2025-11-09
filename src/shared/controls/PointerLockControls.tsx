import { useEffect, useRef, useState } from "react";

const PointerLockControls = ({ onMouseMove }: { onMouseMove?: (e: MouseEvent) => void }) => {
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const handleClick = () => {
            canvas.requestPointerLock();
        };

        const handlePointerLockChange = () => {
            setIsLocked(document.pointerLockElement === canvas);
        };

        canvas.addEventListener('click', handleClick);
        document.addEventListener('pointerlockchange', handlePointerLockChange);

        return () => {
            canvas.removeEventListener('click', handleClick);
            document.removeEventListener('pointerlockchange', handlePointerLockChange);
        };
    }, []);

    useEffect(() => {
        if (!onMouseMove || !isLocked) return;

        const handleMouseMove = (e: MouseEvent) => {
            onMouseMove(e);
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isLocked, onMouseMove]);

    return null;
}

export default PointerLockControls;