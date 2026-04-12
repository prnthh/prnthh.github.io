
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { PostProcessing, WebGPURenderer } from "three/webgpu";
import { pass, mrt, output, directionToColor, normalView, vec4 } from "three/tsl";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";

type RenderPipelineProps = {
    aoResolutionScale?: number;
    aoRadius?: number;
    aoScale?: number;
    aoThickness?: number;
    aoDistanceExponent?: number;
    aoDistanceFallOff?: number;
    aoSamples?: number;
    denoiseEnabled?: boolean;
    denoiseRadius?: number;
    denoiseLumaPhi?: number;
    denoiseDepthPhi?: number;
    denoiseNormalPhi?: number;
    aoPower?: number;
};

const RenderPipeline = ({
    aoResolutionScale = 1,
    aoRadius = 0.18,
    aoScale = 1,
    aoThickness = 0.25,
    aoDistanceExponent = 2,
    aoDistanceFallOff = 0.9,
    aoSamples = 8,
    denoiseEnabled = true,
    denoiseRadius = 2.5,
    denoiseLumaPhi = 8,
    denoiseDepthPhi = 3,
    denoiseNormalPhi = 24,
    aoPower = 1.02,
}: RenderPipelineProps) => {
    const { gl, scene, camera } = useThree();

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

        ambientOcclusion.resolutionScale = aoResolutionScale;
        ambientOcclusion.radius.value = aoRadius;
        ambientOcclusion.scale.value = aoScale;
        ambientOcclusion.thickness.value = aoThickness;
        ambientOcclusion.distanceExponent.value = aoDistanceExponent;
        ambientOcclusion.distanceFallOff.value = aoDistanceFallOff;
        ambientOcclusion.samples.value = aoSamples;

        const ambientOcclusionNode = denoiseEnabled
            ? denoise(ambientOcclusion.getTextureNode(), sceneDepth, sceneNormal, camera)
            : ambientOcclusion.getTextureNode();

        if (denoiseEnabled && "radius" in ambientOcclusionNode) {
            ambientOcclusionNode.radius.value = denoiseRadius;
            ambientOcclusionNode.lumaPhi.value = denoiseLumaPhi;
            ambientOcclusionNode.depthPhi.value = denoiseDepthPhi;
            ambientOcclusionNode.normalPhi.value = denoiseNormalPhi;
        }

        const aoFactor = ambientOcclusionNode.r.pow(aoPower);
        pipeline.outputNode = vec4(sceneColor.rgb.mul(aoFactor), sceneColor.a);

        return pipeline;
    }, [
        aoDistanceExponent,
        aoDistanceFallOff,
        aoPower,
        aoRadius,
        aoResolutionScale,
        aoSamples,
        aoScale,
        aoThickness,
        camera,
        denoiseDepthPhi,
        denoiseEnabled,
        denoiseLumaPhi,
        denoiseNormalPhi,
        denoiseRadius,
        gl,
        scene,
    ]);

    useEffect(() => {
        return () => {
            postProcessing.dispose();
        };
    }, [postProcessing]);

    useFrame(() => {
        postProcessing.render();
    }, 1);

    return null;
};

export default RenderPipeline;