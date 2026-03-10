"use client";

import { createContext, useContext, useRef, useState, useEffect, ReactNode } from "react";

const NUM_BANDS = 20;
const SENSITIVITY = 2.1;
const SMOOTHING = 0.18;
const LOW_FREQ = 20;
const HIGH_FREQ = 20000;

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
    bandsRef: React.RefObject<Float32Array>;
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
        bass: 0, mid: 0, high: 0, energy: 0, beatCount: 0, currentTime: 0
    });

    const [elementColor, setElementColor] = useState<number>(0x000000);

    const beatCountRef = useRef(0);
    const lastBeatTimeRef = useRef<number>(0);
    const energyHistoryRef = useRef<number[]>([]);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    // 20 log-spaced frequency bands
    const bandsRef = useRef<Float32Array>(new Float32Array(NUM_BANDS));
    const rawBandsRef = useRef<Float32Array>(new Float32Array(NUM_BANDS));
    const binRangesRef = useRef<[number, number][]>([]);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const setupBinRanges = (sampleRate: number, fftSize: number) => {
        const binWidth = sampleRate / fftSize;
        const edges = new Float32Array(NUM_BANDS + 1);
        for (let i = 0; i <= NUM_BANDS; i++) {
            edges[i] = LOW_FREQ * Math.pow(HIGH_FREQ / LOW_FREQ, i / NUM_BANDS);
        }
        const ranges: [number, number][] = [];
        for (let i = 0; i < NUM_BANDS; i++) {
            const lo = Math.max(1, Math.round(edges[i] / binWidth));
            const hi = Math.min(fftSize / 2 - 1, Math.round(edges[i + 1] / binWidth));
            ranges.push([lo, Math.max(lo, hi)]);
        }
        binRangesRef.current = ranges;
    };

    const analyzeAudio = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
            dataArrayRef.current = new Uint8Array(bufferLength);
        }
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        const ranges = binRangesRef.current;
        const raw = rawBandsRef.current;
        const smoothed = bandsRef.current;
        const data = dataArrayRef.current;

        // Compute 20 log-spaced frequency bands with smoothing
        for (let i = 0; i < NUM_BANDS; i++) {
            if (i >= ranges.length) break;
            const [lo, hi] = ranges[i];
            let sum = 0;
            for (let j = lo; j <= hi; j++) sum += data[j];
            const avg = sum / (hi - lo + 1) / 255;
            raw[i] = avg * SENSITIVITY;
            smoothed[i] += (raw[i] - smoothed[i]) * SMOOTHING;
        }

        // Derive bass/mid/high from bands for backward compat
        const bassEnd = 3;
        const midEnd = 10;
        let bassSum = 0, midSum = 0, highSum = 0;
        for (let i = 0; i < NUM_BANDS; i++) {
            if (i < bassEnd) bassSum += smoothed[i];
            else if (i < midEnd) midSum += smoothed[i];
            else highSum += smoothed[i];
        }
        const bass = (bassSum / bassEnd) * 85;
        const mid = (midSum / (midEnd - bassEnd)) * 85;
        const high = (highSum / (NUM_BANDS - midEnd)) * 85;
        const energy = (bass + mid + high) / 3;

        // Beat detection using bass with adaptive threshold
        const energyHistory = energyHistoryRef.current;
        energyHistory.push(bass);
        if (energyHistory.length > 43) energyHistory.shift();

        if (energyHistory.length > 20) {
            let avg = 0;
            for (let i = 0; i < energyHistory.length; i++) avg += energyHistory[i];
            avg /= energyHistory.length;

            let variance = 0;
            for (let i = 0; i < energyHistory.length; i++) {
                variance += (energyHistory[i] - avg) ** 2;
            }
            const stdDev = Math.sqrt(variance / energyHistory.length);

            const now = Date.now();
            const threshold = avg + stdDev * 1.3;
            if (bass > threshold && now - lastBeatTimeRef.current > 150) {
                beatCountRef.current += 1;
                lastBeatTimeRef.current = now;
            }
        }

        const currentTime = audioRef.current?.currentTime || 0;
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
                analyserRef.current.fftSize = 2048;
                analyserRef.current.smoothingTimeConstant = 0.3;
                source.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);

                // Compute log-spaced bin ranges for 20 bands
                setupBinRanges(audioContextRef.current.sampleRate, 2048);
            }

            audioRef.current.currentTime = 0;
            audioRef.current.play();
            beatCountRef.current = 0;
            lastBeatTimeRef.current = 0;
            energyHistoryRef.current = [];
            bandsRef.current.fill(0);
            rawBandsRef.current.fill(0);
            analyzeAudio();
        }
    };

    const pause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    return (
        <MusicContext.Provider value={{ audioData, play, pause, audioRef, beatCountRef, elementColor, bandsRef }}>
            <audio ref={audioRef} src={song} loop />
            {children}
        </MusicContext.Provider>
    );
}
