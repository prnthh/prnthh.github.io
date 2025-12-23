"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js";

export default function AsciiEffectRenderer() {
    const { gl, scene, camera, size } = useThree();
    const effectRef = useRef<AsciiEffect | null>(null);

    useEffect(() => {
        // Create ASCII effect with more dense characters for brighter appearance
        // Skip space, start with visible characters
        const effect = new AsciiEffect(gl, '·:-=!*#@▒█', {
            invert: false,
            resolution: 0.13, // Slightly higher resolution for smoother appearance
            color: true // Enable color support
        });
        effect.setSize(size.width, size.height);
        effect.domElement.style.position = 'absolute';
        effect.domElement.style.top = '0';
        effect.domElement.style.left = '0';
        effect.domElement.style.pointerEvents = 'none';
        effect.domElement.style.backgroundColor = 'black';

        // Enhance color saturation, contrast, and brightness
        effect.domElement.style.filter = 'saturate(2.2) contrast(1.4) brightness(1.4)';
        effect.domElement.style.imageRendering = 'crisp-edges';

        effectRef.current = effect;

        // Hide the original canvas since we're only using ASCII
        gl.domElement.style.display = 'none';

        // Append to the canvas parent
        const container = gl.domElement.parentElement;
        if (container) {
            container.appendChild(effect.domElement);
        }

        return () => {
            gl.domElement.style.display = 'block';
            if (effect.domElement.parentElement) {
                effect.domElement.parentElement.removeChild(effect.domElement);
            }
        };
    }, [gl, size]);

    useEffect(() => {
        if (effectRef.current) {
            effectRef.current.setSize(size.width, size.height);
        }
    }, [size]);

    useFrame(() => {
        if (effectRef.current) {
            effectRef.current.render(scene, camera);
        }
    }, 1); // Priority 1 to render after everything else

    return null;
}
