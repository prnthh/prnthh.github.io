
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { PostProcessing, WebGPURenderer } from "three/webgpu";
import { pass, mrt, output, directionToColor, normalView, vec4 } from "three/tsl";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";

type RenderPipelineQuality = "low" | "medium" | "high";

type RenderPipelineProps = {
    quality?: RenderPipelineQuality;
    denoiseEnabled?: boolean;
};

const QUALITY_PRESETS: Record<RenderPipelineQuality, {
    resolutionScale: number;
    radius: number;
    scale: number;
    thickness: number;
    distanceExponent: number;
    distanceFallOff: number;
    samples: number;
    blendExponent: number;
    denoiseRadius: number;
    denoiseLumaPhi: number;
    denoiseDepthPhi: number;
    denoiseNormalPhi: number;
}> = {
    low: {
        resolutionScale: 0.5,
        radius: 0.14,
        scale: 0.75,
        thickness: 0.2,
        distanceExponent: 1.6,
        distanceFallOff: 0.9,
        samples: 6,
        blendExponent: 1,
        denoiseRadius: 1.25,
        denoiseLumaPhi: 5,
        denoiseDepthPhi: 2,
        denoiseNormalPhi: 12,
    },
    medium: {
        resolutionScale: 0.75,
        radius: 0.16,
        scale: 0.8,
        thickness: 0.22,
        distanceExponent: 1.7,
        distanceFallOff: 0.92,
        samples: 8,
        blendExponent: 1.01,
        denoiseRadius: 2,
        denoiseLumaPhi: 7,
        denoiseDepthPhi: 2.5,
        denoiseNormalPhi: 18,
    },
    high: {
        resolutionScale: 1,
        radius: 0.18,
        scale: 0.85,
        thickness: 0.25,
        distanceExponent: 1.8,
        distanceFallOff: 0.95,
        samples: 16,
        blendExponent: 1.02,
        denoiseRadius: 2.5,
        denoiseLumaPhi: 8,
        denoiseDepthPhi: 3,
        denoiseNormalPhi: 24,
    },
};

const RenderPipeline = ({ quality = "low", denoiseEnabled = true }: RenderPipelineProps) => {
    const { gl, scene, camera } = useThree();
    const preset = QUALITY_PRESETS[quality];

    const postProcessing = useMemo(() => {
        const pipeline = new PostProcessing(gl as unknown as WebGPURenderer);
        const scenePass = pass(scene, camera);

        scenePass.setMRT(mrt({
            output,
            normal: directionToColor(normalView),
        }));

        const sceneColor = scenePass.getTextureNode("output");
        const sceneDepth = scenePass.getTextureNode("depth");
        const sceneNormal = scenePass.getTextureNode("normal");
        const ambientOcclusion = ao(sceneDepth, sceneNormal, camera);

        ambientOcclusion.resolutionScale = preset.resolutionScale;
        ambientOcclusion.radius.value = preset.radius;
        ambientOcclusion.scale.value = preset.scale;
        ambientOcclusion.thickness.value = preset.thickness;
        ambientOcclusion.distanceExponent.value = preset.distanceExponent;
        ambientOcclusion.distanceFallOff.value = preset.distanceFallOff;
        ambientOcclusion.samples.value = preset.samples;

        const aoTexture = ambientOcclusion.getTextureNode();

        if (denoiseEnabled) {
            const denoisedAmbientOcclusion = denoise(aoTexture, sceneDepth, sceneNormal, camera);
            denoisedAmbientOcclusion.radius.value = preset.denoiseRadius;
            denoisedAmbientOcclusion.lumaPhi.value = preset.denoiseLumaPhi;
            denoisedAmbientOcclusion.depthPhi.value = preset.denoiseDepthPhi;
            denoisedAmbientOcclusion.normalPhi.value = preset.denoiseNormalPhi;
            pipeline.outputNode = vec4(sceneColor.rgb.mul(denoisedAmbientOcclusion.r.pow(preset.blendExponent)), sceneColor.a);
            return pipeline;
        }

        const aoFactor = aoTexture.r.pow(preset.blendExponent);
        pipeline.outputNode = vec4(sceneColor.rgb.mul(aoFactor), sceneColor.a);

        return pipeline;
    }, [camera, denoiseEnabled, gl, preset, scene]);

    useFrame(() => {
        postProcessing.render();
    }, 1);

    return null;
};

export default RenderPipeline;