"use client";

import { useEffect } from "react";

interface AnimatedCursorProps {
    frameCount?: number;
    frameDuration?: number;
    basePath?: string;
}

export default function AnimatedCursor({
    frameCount = 15,
    frameDuration = 60,
    basePath = "/cursors/blue",
}: AnimatedCursorProps) {
    useEffect(() => {
        let frameIndex = 0;
        let animationId: ReturnType<typeof setInterval>;

        const updateCursor = () => {
            document.body.style.cursor = `url('${basePath}/cursor_frame_${frameIndex}.png'), auto`;
            frameIndex = (frameIndex + 1) % frameCount;
        };

        updateCursor();
        animationId = setInterval(updateCursor, frameDuration);

        return () => clearInterval(animationId);
    }, [frameCount, frameDuration, basePath]);

    return null;
}
