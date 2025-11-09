import { Canvas, extend } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Suspense, useState } from "react";
import { WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.Nodes.js";

// generic version
// extend(THREE as any)

extend({
    MeshBasicNodeMaterial: THREE.MeshBasicNodeMaterial,
    MeshStandardNodeMaterial: THREE.MeshStandardNodeMaterial,
});


export default function GameCanvas({ children, ...props }: { children: React.ReactNode, props?: WebGPURendererParameters }) {
    const [frameloop, setFrameloop] = useState<"never" | "always">("never");
    const [loading, setLoading] = useState(true);

    return <>
        {loading && <Loading />}

        <Canvas
            shadows={{ type: THREE.PCFSoftShadowMap }}
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
                <DelayedLoadingScreen onLoad={() => setLoading(false)} />
            </Suspense>
        </Canvas>
    </>;
}


const Loading = () => {
    return (
        <div className="absolute flex items-center justify-center w-screen h-screen z-5 backdrop-blur-md text-white font-black">
            Loading...
        </div>
    );
}

const DelayedLoadingScreen = ({ onLoad }: { onLoad: () => void }) => {
    setTimeout(() => {
        onLoad();
    }, 100);
    return null;
};