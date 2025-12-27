"use client";

import { useMusic } from "./MusicProvider";
import AudioVisualizer from "./AudioVisualizer";
import AsciiEffectRenderer from "./AsciiEffectRenderer";
import { OrthographicCamera } from "@react-three/drei";
import DynamicBackground from "./DynamicBackground";
import GameCanvas from "@/shared/GameCanvas";

export function MusicDemo() {
    const { audioData, play } = useMusic();

    return (
        <div className="absolute top-0 left-0 w-screen h-screen flex items-center justify-center pointer-events-none select-none z-0" onClick={play}>
            <GameCanvas >
                <OrthographicCamera makeDefault position={[0, 0, 0]} zoom={120} />
                <AudioVisualizer />
                <AsciiEffectRenderer />
                <DynamicBackground />
            </GameCanvas>
        </div>

    );
} 