"use client";

import { useMusic } from "./MusicProvider";
import AudioVisualizer from "./AudioVisualizer";
import AsciiEffectRenderer from "./AsciiEffectRenderer";
import { GameCanvas } from "react-three-game";

export function MusicDemo() {
    const { audioData, play } = useMusic();

    return (
        <div className="absolute top-0 left-0 w-screen h-screen flex items-center justify-center pointer-events-none select-none z-0" onClick={play}>
            <GameCanvas >
                <AudioVisualizer />
                <AsciiEffectRenderer />
                <color attach="background" args={["white"]} />
            </GameCanvas>
        </div>

    );
} 