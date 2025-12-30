"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMusic } from "./MusicProvider";

const WHITE = new THREE.Color(1, 1, 1);
const BLACK = new THREE.Color(0, 0, 0);

export default function DynamicBackground() {
    const { audioData } = useMusic();
    const { scene } = useThree();
    const lastBgColor = useRef<string>("");

    // Set initial background immediately
    if (!scene.background) {
        scene.background = WHITE.clone();
    }

    useFrame(() => {
        const currentTime = audioData.currentTime;

        // Determine background color: white before 30s, black after
        const targetColor = currentTime < 30 ? "white" : "black";

        // Only update if color changed
        if (targetColor !== lastBgColor.current) {
            lastBgColor.current = targetColor;
            (scene.background as THREE.Color).copy(targetColor === "white" ? WHITE : BLACK);
        }
    });

    return null;
}
