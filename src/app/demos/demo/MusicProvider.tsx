"use client";

import { createContext, useContext, useRef, useState, useEffect, ReactNode } from "react";

interface AudioData {
    bass: number;
    mid: number;
    high: number;
    energy: number;
    beatCount: number;
    currentTime: number;
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
        beatCount: 0,
        currentTime: 0
    });

    const beatCountRef = useRef(0);
    const lastBeatTimeRef = useRef<number>(0);
    const energyHistoryRef = useRef<number[]>([]);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

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

        if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
            dataArrayRef.current = new Uint8Array(bufferLength);
        }
        const dataArray = dataArrayRef.current;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate frequency bands
        let bassSum = 0, midSum = 0, highSum = 0, energySum = 0;
        const bassEnd = Math.floor(bufferLength / 8);
        const midEnd = Math.floor(bufferLength / 2);

        for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i];
            energySum += val;
            if (i < bassEnd) bassSum += val;
            else if (i < midEnd) midSum += val;
            else highSum += val;
        }

        const bass = bassSum / bassEnd;
        const mid = midSum / (midEnd - bassEnd);
        const high = highSum / (bufferLength - midEnd);
        const energy = energySum / bufferLength;

        // Simple energy-based beat detection
        const energyHistory = energyHistoryRef.current;
        energyHistory.push(energy);
        if (energyHistory.length > 43) energyHistory.shift();

        if (energyHistory.length > 20) {
            let avg = 0;
            for (let i = 0; i < energyHistory.length; i++) avg += energyHistory[i];
            avg /= energyHistory.length;

            const now = Date.now();
            const threshold = avg * 1.3;

            // Beat: energy spike above threshold with 350ms cooldown
            if (energy > threshold && now - lastBeatTimeRef.current > 350) {
                beatCountRef.current += 1;
                lastBeatTimeRef.current = now;
            }
        }

        setAudioData({
            bass: Math.round(bass),
            mid: Math.round(mid),
            high: Math.round(high),
            energy: Math.round(energy),
            beatCount: beatCountRef.current,
            currentTime: audioRef.current?.currentTime || 0
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
            energyHistoryRef.current = [];
            analyzeAudio();
        }
    };

    return (
        <MusicContext.Provider value={{ audioData, play, beatCountRef }}>
            <audio ref={audioRef} src={song} loop />
            {children}
        </MusicContext.Provider>
    );
}
