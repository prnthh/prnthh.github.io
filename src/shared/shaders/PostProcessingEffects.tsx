
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { PostProcessing, WebGPURenderer } from "three/webgpu";
import { pass, mrt, output, directionToColor, normalView } from "three/tsl";
import { ao } from "three/addons/tsl/display/GTAONode.js";

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

        ambientOcclusion.radius.value = 0.1;
        ambientOcclusion.scale.value = 0.2;
        ambientOcclusion.thickness.value = 0.5;
        ambientOcclusion.samples.value = 16;
        ambientOcclusion.resolutionScale = 0.5;

        pipeline.outputNode = sceneColor.mul(ambientOcclusion.getTextureNode().r);

        return pipeline;
    }, [gl, scene, camera]);

    useFrame(() => {
        postProcessing.render();
    }, 1);

    return null;
};

export default RenderPipeline;