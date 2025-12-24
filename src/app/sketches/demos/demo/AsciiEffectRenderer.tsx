"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";

export default function AsciiEffectRenderer() {
    const { gl, scene, camera, size } = useThree();
    const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const chars = ' .:-=+*#%@';
    const resolution = 0.15;

    useEffect(() => {
        // Create offscreen canvas for capturing WebGL render
        const offscreen = document.createElement('canvas');
        offscreenCanvasRef.current = offscreen;

        // Create display canvas for ASCII
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.imageRendering = 'pixelated';
        displayCanvasRef.current = canvas;

        const parent = gl.domElement.parentElement;
        if (parent) {
            gl.domElement.style.display = 'none';
            parent.appendChild(canvas);
        }

        return () => {
            gl.domElement.style.display = 'block';
            if (canvas.parentElement) {
                canvas.parentElement.removeChild(canvas);
            }
        };
    }, [gl]);

    useFrame(() => {
        if (!offscreenCanvasRef.current || !displayCanvasRef.current) return;

        // Render scene to WebGL
        gl.render(scene, camera);

        // Get rendered image
        const offscreen = offscreenCanvasRef.current;
        const width = Math.floor(size.width * resolution);
        const height = Math.floor(size.height * resolution);

        offscreen.width = width;
        offscreen.height = height;

        const ctx = offscreen.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Copy from WebGL canvas
        ctx.drawImage(gl.domElement, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Setup display canvas
        const displayCanvas = displayCanvasRef.current;
        displayCanvas.width = size.width;
        displayCanvas.height = size.height;
        const displayCtx = displayCanvas.getContext('2d');
        if (!displayCtx) return;

        // Calculate character size
        const charWidth = size.width / width;
        const charHeight = size.height / height;
        const fontSize = charWidth / 0.6;

        // Get background color from the scene
        const bgColor = scene.background;
        if (bgColor && 'r' in bgColor) {
            const r = Math.floor(bgColor.r * 255);
            const g = Math.floor(bgColor.g * 255);
            const b = Math.floor(bgColor.b * 255);
            displayCtx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
            displayCtx.fillStyle = 'white';
        }
        displayCtx.fillRect(0, 0, size.width, size.height);
        displayCtx.font = `${fontSize}px monospace`;
        displayCtx.textBaseline = 'top';

        // Draw ASCII with colors
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const brightness = (r + g + b) / 3;
                const charIndex = Math.floor((brightness / 255) * (chars.length - 1));
                const char = chars[charIndex];

                displayCtx.fillStyle = `rgb(${r},${g},${b})`;
                displayCtx.fillText(char, x * charWidth, y * charHeight);
            }
        }
    }, 1);

    return null;
}
