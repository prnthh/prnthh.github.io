"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { PostProcessing, WebGPURenderer } from "three/webgpu";
import { uniform } from "three/tsl";
import { pixelationPass } from "three/addons/tsl/display/PixelationPassNode.js";
import { useEffect, useMemo } from "react";

export default function PixelationEffect({
    pixelSize = 6,
    normalEdgeStrength = 0.3,
    depthEdgeStrength = 0.4,
}: {
    pixelSize?: number;
    normalEdgeStrength?: number;
    depthEdgeStrength?: number;
}) {
    const { gl, scene, camera } = useThree();

    const uniforms = useMemo(
        () => ({
            pixelSize: uniform(pixelSize),
            normalEdgeStrength: uniform(normalEdgeStrength),
            depthEdgeStrength: uniform(depthEdgeStrength),
        }),
        []
    );

    useEffect(() => {
        uniforms.pixelSize.value = pixelSize;
        uniforms.normalEdgeStrength.value = normalEdgeStrength;
        uniforms.depthEdgeStrength.value = depthEdgeStrength;
    }, [depthEdgeStrength, normalEdgeStrength, pixelSize, uniforms]);

    const postProcessing = useMemo(() => {
        const pp = new PostProcessing(gl as unknown as WebGPURenderer);
        const scenePass = pixelationPass(
            scene,
            camera,
            uniforms.pixelSize,
            uniforms.normalEdgeStrength,
            uniforms.depthEdgeStrength
        );
        pp.outputNode = scenePass;
        return pp;
    }, [gl, scene, camera]);

    useFrame(() => {
        postProcessing.render();
    }, 1);

    return null;
}
