"use client";

import { createContext, useContext, useRef, useState, useEffect, ReactNode } from "react";

interface AudioData {
    bass: number;
    mid: number;
    high: number;
    energy: number;
    beatCount: number;
}

interface MusicContextType {
    audioData: AudioData;
    play: () => void;
    beatCountRef: React.RefObject<number>;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error("useMusic must be used within MusicProvider");
    }
    return context;
};

interface MusicProviderProps {
    children: ReactNode;
    song: string;
}

export default function MusicProvider({ children, song }: MusicProviderProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const [audioData, setAudioData] = useState<AudioData>({
        bass: 0,
        mid: 0,
        high: 0,
        energy: 0,
        beatCount: 0
    });

    const beatCountRef = useRef(0);
    const lastBeatTimeRef = useRef<number>(0);
    const lastSpectrumRef = useRef<Uint8Array | null>(null);
    const fluxHistoryRef = useRef<number[]>([]);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const analyzeAudio = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const bass = dataArray.slice(0, bufferLength / 8).reduce((a, b) => a + b, 0) / (bufferLength / 8);
        const mid = dataArray.slice(bufferLength / 8, bufferLength / 2).reduce((a, b) => a + b, 0) / (bufferLength * 3 / 8);
        const high = dataArray.slice(bufferLength / 2).reduce((a, b) => a + b, 0) / (bufferLength / 2);
        const energy = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        const now = Date.now();

        // Spectral flux for onset detection
        let flux = 0;
        if (lastSpectrumRef.current) {
            // Focus on mid-high frequencies to avoid bass rumble
            for (let i = Math.floor(bufferLength / 4); i < bufferLength; i++) {
                const diff = dataArray[i] - lastSpectrumRef.current[i];
                if (diff > 0) flux += diff;
            }
        }
        lastSpectrumRef.current = new Uint8Array(dataArray);

        // Adaptive flux threshold
        const fluxHistory = fluxHistoryRef.current;
        fluxHistory.push(flux);
        if (fluxHistory.length > 43) fluxHistory.shift();

        const avgFlux = fluxHistory.reduce((a, b) => a + b, 0) / fluxHistory.length;
        const fluxThreshold = avgFlux * 2.5; // Increased to 2.5 for even less sensitivity

        // Beat detection: onset with cooldown
        if (flux > fluxThreshold && flux > 20 && now - lastBeatTimeRef.current > 200 && fluxHistory.length > 20) {
            beatCountRef.current += 1;
            lastBeatTimeRef.current = now;
        }

        setAudioData({
            bass: Math.round(bass),
            mid: Math.round(mid),
            high: Math.round(high),
            energy: Math.round(energy),
            beatCount: beatCountRef.current
        });

        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    };

    const play = () => {
        if (audioRef.current) {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = audioContextRef.current.createMediaElementSource(audioRef.current);
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                source.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
            }

            audioRef.current.currentTime = 0;
            audioRef.current.play();
            beatCountRef.current = 0;
            lastBeatTimeRef.current = 0;
            lastSpectrumRef.current = null;
            fluxHistoryRef.current = [];
            analyzeAudio();
        }
    };

    return (
        <MusicContext.Provider value={{ audioData, play, beatCountRef }}>
            <audio ref={audioRef} src={song} />
            {children}
        </MusicContext.Provider>
    );
}
