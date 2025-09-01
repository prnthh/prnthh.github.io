
import { useFrame, useThree } from "@react-three/fiber";
import { PostProcessing, WebGPURenderer } from "three/webgpu";
import { pass, mrt, output, emissive, saturation, blendColor, directionToColor, normalView, roughness, metalness, vec2, sample, colorToDirection } from 'three/tsl';
import { useEffect, useState } from "react";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import * as THREE from "three";
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { ssr } from "three/examples/jsm/tsl/display/SSRNode.js";
import { smaa } from "three/examples/jsm/tsl/display/SMAANode.js";

const RenderPipeline = () => {
    const { gl, scene, camera } = useThree()

    const [postProcessing, setPostProcessing] = useState<PostProcessing>(new PostProcessing(gl as unknown as WebGPURenderer))

    useEffect(() => {
        // const scenePass = pass(scene, camera, {
        //     magFilter: THREE.NearestFilter,
        //     minFilter: THREE.NearestFilter,
        // })

        // scenePass.setMRT(mrt({ output }))

        // const scenePassColor = scenePass.getTextureNode('output')

        // const strength = 0.2
        // const radius = 0.02
        // const threshold = 0
        // const bloomPass = bloom(scenePassColor, strength, radius, threshold)

        // const outputNode = blendColor(scenePassColor, bloomPass)
        const scenePass = pass(scene, camera, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
        scenePass.setMRT(mrt({
            output: output,
            normal: directionToColor(normalView),
            metalrough: vec2(metalness, roughness)
        }));

        const scenePassColor = scenePass.getTextureNode('output');
        const scenePassNormal = scenePass.getTextureNode('normal');
        const scenePassDepth = scenePass.getTextureNode('depth');
        const scenePassMetalRough = scenePass.getTextureNode('metalrough');
        const sceneNormal = sample((uv) => {
            return colorToDirection(scenePassNormal.sample(uv));
        });

        // const ssrPass = ssr(scenePassColor, scenePassDepth, sceneNormal, scenePassMetalRough.r, scenePassMetalRough.g);
        // ssrPass.maxDistance.value = 10;
        // ssrPass.blurQuality.value = 1;
        // ssrPass.thickness.value = 0.015;
        // ssrPass.resolutionScale = 0.5;

        const aoPass = ao(scenePassDepth, sceneNormal, camera);
        // @ts-expect-error custom property
        aoPass.radius = 0.2;
        // @ts-expect-error custom property
        aoPass.scale = 0.2;
        // @ts-expect-error custom property
        aoPass.thickness = 0.5;

        const blendPassAO = aoPass.getTextureNode().mul(scenePassColor);
        postProcessing.outputNode = blendPassAO;

        // const outputNode = smaa(blendPassAO);
        // const outputNode = smaa(blendColor(blendPassAO, ssrPass));
        // postProcessing.outputNode = outputNode;
    }, [gl, scene, camera])

    useFrame(() => { postProcessing?.render() }, 1)

    return null
}
export default RenderPipeline;