"use client";

import { useState } from "react";
import { useMusic } from "./MusicProvider";
import AudioVisualizer from "./AudioVisualizer";
import AsciiEffectRenderer from "./AsciiEffectRenderer";
import { OrthographicCamera } from "@react-three/drei";
import DynamicBackground from "./DynamicBackground";
import GameCanvas from "@/shared/GameCanvas";

export function MusicDemo() {
    const SHOW_DEBUG_UI = false;

    const { audioData, play, pause, audioRef } = useMusic();
    const [debugStage, setDebugStage] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                pause();
            } else {
                play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {/* Debug UI */}
            {SHOW_DEBUG_UI && (
                <div className="absolute bottom-4 right-4 z-50 pointer-events-auto text-black">
                    <div className="bg-white/90 border border-black p-3 rounded space-y-3">
                        {/* Stage Selection */}
                        <div>
                            <div className="text-sm font-mono mb-2">Debug Stage:</div>
                            <select
                                value={debugStage ?? "auto"}
                                onChange={(e) => setDebugStage(e.target.value === "auto" ? null : Number(e.target.value))}
                                className="border border-black bg-white px-2 py-1 text-sm font-mono w-full"
                            >
                                <option value="auto">Auto (time-based)</option>
                                <option value="1">Stage 1</option>
                                <option value="2">Stage 2</option>
                                <option value="3">Stage 3</option>
                            </select>
                        </div>

                        {/* Playback Controls */}
                        <div>
                            <div className="text-sm font-mono mb-2">Playback:</div>
                            <button
                                onClick={handlePlayPause}
                                className="border border-black bg-white px-3 py-1 text-sm font-mono hover:bg-gray-100 w-full"
                            >
                                {isPlaying ? "⏸ Pause" : "▶ Play"}
                            </button>
                        </div>

                        {/* Music Info */}
                        <div className="text-xs font-mono space-y-1 border-t border-black pt-2">
                            <div>Time: {formatTime(audioData.currentTime)}</div>
                            <div>Bass: {audioData.bass}</div>
                            <div>Mid: {audioData.mid}</div>
                            <div>High: {audioData.high}</div>
                            <div>Beats: {audioData.beatCount}</div>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="absolute top-0 left-0 w-screen h-screen flex items-center justify-center pointer-events-none select-none z-0"
                onClick={() => {
                    if (!isPlaying) {
                        play();
                        setIsPlaying(true);
                    }
                }}
            >
                <GameCanvas>
                    <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={120} />
                    <AudioVisualizer debugStage={debugStage} />
                    <AsciiEffectRenderer />
                    <DynamicBackground />
                </GameCanvas>
            </div>
        </>
    );
} 