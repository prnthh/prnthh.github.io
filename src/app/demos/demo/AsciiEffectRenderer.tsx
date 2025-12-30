"use client";
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";

export default function AsciiEffectRenderer() {
    const { gl, scene, camera, size } = useThree();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const offRef = useRef<HTMLCanvasElement | null>(null);
    const P = { h: ['-', '='], v: ['|', 'I', '!'], d: ['#', '%', '@', '█'] };

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
        const cw = size.width / w, cy = size.height / h;

        // Background - subtle for dark areas, preserve bright areas (terminal-like)
        const bg = document.createElement('canvas');
        bg.width = w; bg.height = h;
        const bc = bg.getContext('2d');
        if (bc) {
            const bd = bc.createImageData(w, h);
            for (let i = 0; i < px.length; i += 4) {
                const brightness = (px[i] + px[i + 1] + px[i + 2]) / 3;
                // Keep bright areas bright (>200), darken everything else
                const factor = brightness > 200 ? 0.95 : 0.08;
                bd.data[i] = ~~(px[i] * factor);
                bd.data[i + 1] = ~~(px[i + 1] * factor);
                bd.data[i + 2] = ~~(px[i + 2] * factor);
                bd.data[i + 3] = 255;
            }
            bc.putImageData(bd, 0, 0);
            dc.imageSmoothingEnabled = false;
            dc.drawImage(bg, 0, 0, size.width, size.height);
        }

        dc.font = `${cw / 0.6}px monospace`;
        dc.textBaseline = 'top';
        const B = (x: number, y: number) => x < 0 || x >= w || y < 0 || y >= h ? 255 : (px[(y * w + x) * 4] + px[(y * w + x) * 4 + 1] + px[(y * w + x) * 4 + 2]) / 3;

        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
            const br = B(x, y), d = (255 - br) / 255;
            const hg = Math.abs(B(x + 1, y) - B(x - 1, y)), vg = Math.abs(B(x, y + 1) - B(x, y - 1));
            const d1 = Math.abs(B(x + 1, y + 1) - B(x - 1, y - 1)), d2 = Math.abs(B(x - 1, y + 1) - B(x + 1, y - 1));
            const mg = Math.max(hg, vg, d1, d2);

            let ch = d < .15 ? ' ' : mg > 50 ? (hg > vg * 1.3 ? P.v[~~(d * 3) % 3] : vg > hg * 1.3 ? P.h[~~(d * 2) % 2] : d1 > d2 * 1.3 ? '/' : d2 > d1 * 1.3 ? '\\' : '+*'[~~(d * 2) % 2]) : d < .25 ? '.' : d < .4 ? '+' : P.d[Math.min(~~((d - .4) / .6 * 4), 3)];
            dc.fillStyle = `rgb(${r},${g},${b})`;
            dc.fillText(ch, ~~(x * cw), ~~(y * cy));
        }
    }, 1);

    return null;
}
