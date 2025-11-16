import { Canvas, extend } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Suspense, useState } from "react";
import { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";
import { Loader } from "@react-three/drei";

// generic version
// extend(THREE as any)

extend({
    MeshBasicNodeMaterial: THREE.MeshBasicNodeMaterial,
    MeshStandardNodeMaterial: THREE.MeshStandardNodeMaterial,
});


export default function GameCanvas({ loader = false, children, ...props }: { loader?: boolean, children: React.ReactNode, props?: WebGPURendererParameters }) {
    const [frameloop, setFrameloop] = useState<"never" | "always">("never");
    const [loading, setLoading] = useState(true);

    return <>
        <Canvas
            shadows={{ type: THREE.PCFShadowMap, }}
            frameloop={frameloop}
            gl={async ({ canvas }) => {
                const renderer = new THREE.WebGPURenderer({
                    canvas: canvas as HTMLCanvasElement,
                    // @ts-expect-error futuristic
                    shadowMap: true,
                    ...props,
                });
                await renderer.init().then(() => {
                    setFrameloop("always");
                });
                return renderer
            }}
            camera={{
                position: [0, 5, 10],
            }}
        >
            <Suspense>
                {children}
            </Suspense>
        </Canvas>
        {loader ? <Loader /> : null}
    </>;
}
