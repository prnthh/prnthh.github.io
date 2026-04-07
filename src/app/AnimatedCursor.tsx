"use client";

import { useEffect } from "react";

interface AnimatedCursorProps {
    basePath?: string;
}

export default function AnimatedCursor({
    basePath = "/cursors/blue",
}: AnimatedCursorProps) {
    useEffect(() => {
        document.body.style.cursor = `url('${basePath}/cursor_frame_0.png'), auto`;

        return () => {
            document.body.style.cursor = "";
        };
    }, [basePath]);

    return null;
}
