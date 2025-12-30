"use client";
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";

export default function AsciiEffectRenderer() {
    const { gl, scene, camera, size } = useThree();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const offRef = useRef<HTMLCanvasElement | null>(null);
    // Character sets by fill percentage and orientation
    const chars = {
        empty: ' ',
        light: ['·', ':', '.'],
        medium: ['-', '=', '|', 'I', '/', '\\', '+'],
        heavy: ['#', '%', '@', '▓'],
        full: '█'
    };

    useEffect(() => {
        const off = document.createElement('canvas');
        offRef.current = off;
        const c = document.createElement('canvas');
        Object.assign(c.style, { position: 'absolute', top: '0', left: '0', imageRendering: 'pixelated' });
        canvasRef.current = c;
        const p = gl.domElement.parentElement;
        if (p) { gl.domElement.style.display = 'none'; p.appendChild(c); }
        return () => { gl.domElement.style.display = 'block'; c.parentElement?.removeChild(c); };
    }, [gl]);

    useFrame(() => {
        const off = offRef.current, c = canvasRef.current;
        if (!off || !c) return;
        gl.render(scene, camera);
        const w = ~~(size.width * 0.15), h = ~~(size.height * 0.15);
        off.width = w; off.height = h;
        const ctx = off.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(gl.domElement, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;
        c.width = size.width; c.height = size.height;
        const dc = c.getContext('2d');
        if (!dc) return;

        // Clear to white background
        dc.fillStyle = 'white';
        dc.fillRect(0, 0, size.width, size.height);

        const cw = size.width / w, cy = size.height / h;

        dc.font = `${cw / 0.6}px monospace`;
        dc.textBaseline = 'top';
        const B = (x: number, y: number) => x < 0 || x >= w || y < 0 || y >= h ? 255 : (px[(y * w + x) * 4] + px[(y * w + x) * 4 + 1] + px[(y * w + x) * 4 + 2]) / 3;

        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
            const br = B(x, y);

            // Calculate fill: bright pixels (white) = empty, dark pixels (black) = full
            // Invert the logic so black objects show as filled
            const fill = br / 255; // 0 = black (full), 1 = white (empty)
            const darkness = 1 - fill; // 0 = white (empty), 1 = black (full)

            // Sample surrounding pixels for edge detection (looking at actual brightness values)
            const left = B(x - 1, y);
            const right = B(x + 1, y);
            const top = B(x, y - 1);
            const bottom = B(x, y + 1);
            const topLeft = B(x - 1, y - 1);
            const topRight = B(x + 1, y - 1);
            const bottomLeft = B(x - 1, y + 1);
            const bottomRight = B(x + 1, y + 1);

            // Sobel-like edge detection for better gradient calculation
            // Horizontal (Gx): detects vertical edges
            const Gx = (-topLeft - 2 * left - bottomLeft + topRight + 2 * right + bottomRight) / 8;
            // Vertical (Gy): detects horizontal edges
            const Gy = (-topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight) / 8;
            // Diagonal gradients with proper weighting
            const Gd1 = (-2 * topLeft - top - left + right + bottom + 2 * bottomRight) / 8; // \ diagonal
            const Gd2 = (-top - 2 * topRight - right + left + 2 * bottomLeft + bottom) / 8; // / diagonal

            // Calculate gradient magnitude
            const gradMagnitude = Math.sqrt(Gx * Gx + Gy * Gy);

            // Higher threshold to reduce noise, and require stronger gradients
            const edgeThreshold = 60;
            const isEdge = gradMagnitude > edgeThreshold;

            // Determine character based on edge detection and darkness
            // Use sparse characters - mostly show edges and light fills
            let ch: string;
            if (darkness < 0.15) {
                ch = chars.empty;
            } else if (isEdge) {
                // At an edge - determine orientation using gradient magnitudes
                // Gx points in direction of intensity increase horizontally
                // Gy points in direction of intensity increase vertically
                const absGx = Math.abs(Gx);
                const absGy = Math.abs(Gy);
                const absGd1 = Math.abs(Gd1);
                const absGd2 = Math.abs(Gd2);

                // Find dominant gradient direction
                if (absGx > absGy * 1.5 && absGx > absGd1 && absGx > absGd2) {
                    // Strong horizontal gradient -> vertical edge
                    ch = '|';
                } else if (absGy > absGx * 1.5 && absGy > absGd1 && absGy > absGd2) {
                    // Strong vertical gradient -> horizontal edge
                    ch = '-';
                } else if (absGd1 > absGd2) {
                    // Diagonal \ gradient stronger
                    ch = '/';
                } else {
                    // Diagonal / gradient stronger
                    ch = '\\';
                }
            } else if (darkness < 0.4) {
                // Light areas - sparse dots
                ch = darkness < 0.25 ? chars.empty : '·';
            } else if (darkness < 0.7) {
                // Medium darkness - light fill pattern
                ch = (x + y) % 2 === 0 ? '·' : chars.empty; // checkerboard pattern
            } else if (darkness < 0.9) {
                // Dark areas - denser fill
                ch = (x + y) % 2 === 0 ? '#' : '·';
            } else {
                // Very dark - full block
                ch = chars.full;
            }

            // Only draw if there's significant content (not pure white)
            if (darkness > 0.05 && ch !== chars.empty) {
                // Draw background glow (transparent color)
                dc.fillStyle = `rgba(${r},${g},${b},0.3)`;
                dc.fillRect(~~(x * cw), ~~(y * cy), Math.ceil(cw), Math.ceil(cy));

                // Draw character in true color
                dc.fillStyle = `rgb(${r},${g},${b})`;
                dc.fillText(ch, ~~(x * cw), ~~(y * cy));
            }
        }
    }, 1);

    return null;
}
