"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js";

export default function AsciiEffectRenderer() {
    const { gl, scene, camera, size } = useThree();
    const effectRef = useRef<AsciiEffect | null>(null);
    const frameCountRef = useRef(0);

    useEffect(() => {
        // Create ASCII effect with lower resolution for better performance
        const effect = new AsciiEffect(gl, ' .:-=+*#%@', {
            invert: false,
            resolution: 0.08, // Lower resolution = better performance (was 0.13)
            color: true // Enable color support
        });
        effect.setSize(size.width, size.height);
        effect.domElement.style.position = 'absolute';
        effect.domElement.style.top = '0';
        effect.domElement.style.left = '0';
        effect.domElement.style.pointerEvents = 'none';
        effect.domElement.style.backgroundColor = 'black';

        // No filters for maximum performance
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
            // Skip frames to improve performance - render every other frame
            frameCountRef.current++;
            if (frameCountRef.current % 2 === 0) {
                effectRef.current.render(scene, camera);
            }
        }
    }, 1); // Priority 1 to render after everything else

    return null;
}
