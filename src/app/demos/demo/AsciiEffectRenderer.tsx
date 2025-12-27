"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";

export default function AsciiEffectRenderer() {
    const { gl, scene, camera, size } = useThree();
    const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const chars = ' .:-=+*#%@';
    const resolution = 0.15;

    // Character mapping based on visual density and patterns
    // organized by: empty, sparse, horizontal, vertical, diagonal, dense
    const patternChars = {
        empty: ' ',
        sparse: '.',
        horizontal: ['-', '='],
        vertical: ['|', 'I', '!'],
        diagonal: ['/', '\\', 'x', 'X'],
        corners: ['+', '*'],
        dense: ['#', '%', '@', '█']
    };

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

        // White background
        displayCtx.fillStyle = 'white';
        displayCtx.fillRect(0, 0, size.width, size.height);
        displayCtx.font = `${fontSize}px monospace`;
        displayCtx.textBaseline = 'top';

        // Helper to get brightness at position
        const getBrightness = (x: number, y: number) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return 255;
            const i = (y * width + x) * 4;
            return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        };

        // Helper to detect edges and patterns
        const analyzePattern = (x: number, y: number) => {
            const center = getBrightness(x, y);
            const left = getBrightness(x - 1, y);
            const right = getBrightness(x + 1, y);
            const top = getBrightness(x, y - 1);
            const bottom = getBrightness(x, y + 1);
            const topLeft = getBrightness(x - 1, y - 1);
            const topRight = getBrightness(x + 1, y - 1);
            const bottomLeft = getBrightness(x - 1, y + 1);
            const bottomRight = getBrightness(x + 1, y + 1);

            // Calculate gradients
            const horizontalGrad = Math.abs(right - left);
            const verticalGrad = Math.abs(bottom - top);
            const diagonalGrad1 = Math.abs(bottomRight - topLeft);
            const diagonalGrad2 = Math.abs(bottomLeft - topRight);

            return {
                brightness: center,
                horizontalGrad,
                verticalGrad,
                diagonalGrad1,
                diagonalGrad2,
                maxGrad: Math.max(horizontalGrad, verticalGrad, diagonalGrad1, diagonalGrad2)
            };
        };

        // Draw ASCII with pattern-aware character selection
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];

                const pattern = analyzePattern(x, y);
                const invertedBrightness = 255 - pattern.brightness;
                const densityRatio = invertedBrightness / 255;

                let char: string;

                // Very light/white - increased threshold to ignore anti-aliasing artifacts
                if (densityRatio < 0.15) {
                    char = patternChars.empty;
                }
                // Check for edges first (high gradient) - use directional chars regardless of density
                else if (pattern.maxGrad > 50) {
                    // Horizontal gradient = vertical edge, vertical gradient = horizontal edge
                    if (pattern.horizontalGrad > pattern.verticalGrad * 1.3) {
                        char = patternChars.vertical[Math.floor(densityRatio * 3) % 3];
                    } else if (pattern.verticalGrad > pattern.horizontalGrad * 1.3) {
                        char = patternChars.horizontal[Math.floor(densityRatio * 2) % 2];
                    } else if (pattern.diagonalGrad1 > pattern.diagonalGrad2 * 1.3) {
                        // diagonalGrad1 = bottomRight - topLeft, so use /
                        char = '/';
                    } else if (pattern.diagonalGrad2 > pattern.diagonalGrad1 * 1.3) {
                        // diagonalGrad2 = bottomLeft - topRight, so use \
                        char = '\\';
                    } else {
                        char = patternChars.corners[Math.floor(densityRatio * 2) % 2];
                    }
                }
                // Light with some detail
                else if (densityRatio < 0.25) {
                    char = patternChars.sparse;
                }
                // Medium density - use denser characters
                else if (densityRatio < 0.4) {
                    char = '+';
                }
                // Dense/dark - most colored cubes will fall here
                else {
                    const denseIndex = Math.floor((densityRatio - 0.4) / 0.6 * patternChars.dense.length);
                    char = patternChars.dense[Math.min(denseIndex, patternChars.dense.length - 1)];
                }

                // Use actual RGB color for text
                displayCtx.fillStyle = `rgb(${r},${g},${b})`;
                displayCtx.fillText(char, x * charWidth, y * charHeight);
            }
        }
    }, 1);

    return null;
}
