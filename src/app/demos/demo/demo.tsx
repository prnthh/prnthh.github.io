"use client";

import { useState } from "react";
import { useMusic } from "./MusicProvider";
import AudioVisualizer from "./AudioVisualizer";
import AsciiEffectRenderer from "./AsciiEffectRenderer";
import DynamicBackground from "./DynamicBackground";
import GameCanvas from "@/shared/GameCanvas";

export function MusicDemo() {
    const { play, pause, audioRef } = useMusic();
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <>
            {/* Click-to-play overlay */}
            {!isPlaying && (
                <div
                    className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
                    onClick={() => {
                        play();
                        setIsPlaying(true);
                    }}
                >
                    <div className="text-6xl text-black/30 hover:text-black/60 transition-colors select-none">
                        ▶
                    </div>
                </div>
            )}

            <div className="absolute top-0 left-0 w-screen h-screen z-0">
                <GameCanvas>
                    <AudioVisualizer />
                    <AsciiEffectRenderer />
                    <DynamicBackground />
                </GameCanvas>
            </div>
        </>
    );
} 