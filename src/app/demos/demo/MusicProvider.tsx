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
    pause: () => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    beatCountRef: React.RefObject<number>;
    elementColor: number;
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

    const [elementColor, setElementColor] = useState<number>(0x000000); // Start with black

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

        // Frequency band ranges (demoscene standard approach)
        // Bass: 20-140 Hz (bins 0-11 at 44.1kHz, FFT 256)
        // Mid: 140-2500 Hz (bins 11-200)
        // High: 2500-20000 Hz (bins 200+)

        const bassEnd = Math.floor(bufferLength * 0.1);  // ~10% for bass
        const midEnd = Math.floor(bufferLength * 0.5);    // ~50% for mid

        // Noise floor threshold - ignore very low values (silence)
        const NOISE_FLOOR = 5;

        let bassSum = 0, bassCount = 0;
        let midSum = 0, midCount = 0;
        let highSum = 0, highCount = 0;
        let energySum = 0;

        // Bass (20-140 Hz) - heavily weighted for kick drums
        for (let i = 0; i < bassEnd; i++) {
            const val = dataArray[i];
            if (val > NOISE_FLOOR) {
                bassSum += val * val; // Square for better peak response
                bassCount++;
            }
            energySum += val;
        }

        // Mid (140-2500 Hz) - most musical content
        for (let i = bassEnd; i < midEnd; i++) {
            const val = dataArray[i];
            if (val > NOISE_FLOOR) {
                midSum += val * val;
                midCount++;
            }
            energySum += val;
        }

        // High (2500-20000 Hz) - cymbals, hi-hats
        for (let i = midEnd; i < bufferLength; i++) {
            const val = dataArray[i];
            if (val > NOISE_FLOOR) {
                highSum += val * val;
                highCount++;
            }
            energySum += val;
        }

        // RMS (root mean square) for each band - standard demoscene approach
        // Use max(1, bassCount) to avoid division by zero during silence
        const bass = bassCount > 0 ? Math.sqrt(bassSum / bassCount) : 0;
        const mid = midCount > 0 ? Math.sqrt(midSum / midCount) : 0;
        const high = highCount > 0 ? Math.sqrt(highSum / highCount) : 0;
        const energy = energySum / bufferLength;

        // Beat detection using bass energy with adaptive threshold
        const energyHistory = energyHistoryRef.current;
        energyHistory.push(bass); // Use bass for beat detection
        if (energyHistory.length > 43) energyHistory.shift();

        if (energyHistory.length > 20) {
            // Compute average and variance for adaptive threshold
            let avg = 0;
            for (let i = 0; i < energyHistory.length; i++) avg += energyHistory[i];
            avg /= energyHistory.length;

            let variance = 0;
            for (let i = 0; i < energyHistory.length; i++) {
                variance += (energyHistory[i] - avg) * (energyHistory[i] - avg);
            }
            const stdDev = Math.sqrt(variance / energyHistory.length);

            const now = Date.now();
            const threshold = avg + stdDev * 1.3; // Adaptive threshold (lowered for better sensitivity)

            // Beat detection: bass spike above threshold with 150ms cooldown (up to 400 BPM)
            // Reduced cooldown to detect quicker beats and double-time patterns
            if (bass > threshold && now - lastBeatTimeRef.current > 150) {
                beatCountRef.current += 1;
                lastBeatTimeRef.current = now;
            }
        }

        const currentTime = audioRef.current?.currentTime || 0;
        const cycleLength = 30;
        const timeInCycle = currentTime % cycleLength;

        // Update element color based on background (inverse)
        // Background is black after 30s, so elements should be white
        const newColor = currentTime >= 30 ? 0xffffff : 0x000000;
        if (newColor !== elementColor) {
            setElementColor(newColor);
        }

        setAudioData({
            bass: Math.round(bass),
            mid: Math.round(mid),
            high: Math.round(high),
            energy: Math.round(energy),
            beatCount: beatCountRef.current,
            currentTime
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

    const pause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    return (
        <MusicContext.Provider value={{ audioData, play, pause, audioRef, beatCountRef, elementColor }}>
            <audio ref={audioRef} src={song} loop />
            {children}
        </MusicContext.Provider>
    );
}
