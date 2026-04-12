
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { PostProcessing, WebGPURenderer } from "three/webgpu";
import { pass, mrt, output, directionToColor, normalView, vec4 } from "three/tsl";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";

const RenderPipeline = () => {
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

        ambientOcclusion.resolutionScale = 1;
        ambientOcclusion.radius.value = 0.18;
        ambientOcclusion.scale.value = 0.85;
        ambientOcclusion.thickness.value = 0.25;
        ambientOcclusion.distanceExponent.value = 1.8;
        ambientOcclusion.distanceFallOff.value = 0.95;
        ambientOcclusion.samples.value = 16;

        const denoisedAmbientOcclusion = denoise(ambientOcclusion.getTextureNode(), sceneDepth, sceneNormal, camera);
        denoisedAmbientOcclusion.radius.value = 2.5;
        denoisedAmbientOcclusion.lumaPhi.value = 8;
        denoisedAmbientOcclusion.depthPhi.value = 3;
        denoisedAmbientOcclusion.normalPhi.value = 24;

        const aoFactor = denoisedAmbientOcclusion.r.pow(1.02);
        pipeline.outputNode = vec4(sceneColor.rgb.mul(aoFactor), sceneColor.a);

        return pipeline;
    }, [gl, scene, camera]);

    useFrame(() => {
        postProcessing.render();
    }, 1);

    return null;
};

export default RenderPipeline;