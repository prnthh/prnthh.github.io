import { Canvas, extend } from "@react-three/fiber";
import { WebGPURenderer, MeshBasicNodeMaterial, MeshStandardNodeMaterial, SpriteNodeMaterial, PCFShadowMap } from "three/webgpu";
import { Suspense, useState } from "react";
import { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";
import { Loader } from "@react-three/drei";

// generic version
// extend(THREE as any)

extend({
    MeshBasicNodeMaterial: MeshBasicNodeMaterial,
    MeshStandardNodeMaterial: MeshStandardNodeMaterial,
    SpriteNodeMaterial: SpriteNodeMaterial,
});


export default function GameCanvas({ loader = false, children, ...props }: { loader?: boolean, children: React.ReactNode, props?: WebGPURendererParameters }) {
    const [frameloop, setFrameloop] = useState<"never" | "always">("never");

    return <>
        <Canvas
            shadows={{ type: PCFShadowMap, }}
            frameloop={frameloop}
            gl={async ({ canvas }) => {
                const renderer = new WebGPURenderer({
                    canvas: canvas as HTMLCanvasElement,
                    // @ts-expect-error futuristic
                    shadowMap: true,
                    antialias: true,
                    ...props,
                });
                await renderer.init().then(() => {
                    setFrameloop("always");
                });
                return renderer
            }}
        >
            <Suspense>
                {children}
            </Suspense>
        </Canvas>
        {loader ? <Loader /> : null}
    </>;
}
