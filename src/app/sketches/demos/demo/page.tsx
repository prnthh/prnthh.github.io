"use client";

import DraggableDiv from "@/shared/ui/DraggableDiv";
import MusicProvider, { useMusic } from "./MusicProvider";
import AudioVisualizer from "./AudioVisualizer";
import AsciiEffectRenderer from "./AsciiEffectRenderer";
import { GameCanvas } from "react-three-game";

function DemoContent() {
    const { audioData, play } = useMusic();

    return (
        <div className="items-center justify-items-center min-h-screen" onClick={play}>
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas >
                    <AudioVisualizer />
                    <AsciiEffectRenderer />
                </GameCanvas>
            </div>
            <div className="z-20 absolute top-0 pointer-events-none" style={{ mixBlendMode: 'screen' }}>
                <div className="pointer-events-auto">
                    <DraggableDiv position={[0, 20]}>
                        <div className="bg-black/50 p-2 rounded text-white flex w-[100px] flex justify-center">
                            <h2 className="font-bold">Demo</h2>
                        </div>
                    </DraggableDiv>

                    <DraggableDiv position={[120, 20]}>
                        <div className="bg-black/80 p-4 rounded text-white min-w-[250px]">
                            <h3 className="font-bold mb-2">Audio Analysis</h3>
                            <div className="mb-3 p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded text-center">
                                <div className="text-xs opacity-75">Beat Count</div>
                                <div className="text-3xl font-bold">{audioData.beatCount}</div>
                            </div>
                            <div className="space-y-1 text-sm font-mono">
                                <div className="flex justify-between">
                                    <span>Bass:</span>
                                    <span className="text-blue-400">{audioData.bass}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Mid:</span>
                                    <span className="text-green-400">{audioData.mid}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>High:</span>
                                    <span className="text-yellow-400">{audioData.high}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Energy:</span>
                                    <span className="text-purple-400">{audioData.energy}</span>
                                </div>
                            </div>

                            {/* Visual bars */}
                            <div className="mt-4 space-y-2">
                                <div className="h-2 bg-gray-700 rounded overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-100"
                                        style={{ width: `${(audioData.bass / 255) * 100}%` }}
                                    />
                                </div>
                                <div className="h-2 bg-gray-700 rounded overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-100"
                                        style={{ width: `${(audioData.mid / 255) * 100}%` }}
                                    />
                                </div>
                                <div className="h-2 bg-gray-700 rounded overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-500 transition-all duration-100"
                                        style={{ width: `${(audioData.high / 255) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </DraggableDiv>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    return (
        <MusicProvider song="/sound/demo1.mp3">
            <DemoContent />
        </MusicProvider>
    );
}
