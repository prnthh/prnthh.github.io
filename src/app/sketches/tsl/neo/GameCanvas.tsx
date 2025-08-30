import { Canvas, extend } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { useState } from "react";

// generic version
// extend(THREE as any)

extend({
    MeshBasicNodeMaterial: THREE.MeshBasicNodeMaterial,
    MeshStandardNodeMaterial: THREE.MeshStandardNodeMaterial,
});


export default function GameCanvas({ children, ...props }: { children: React.ReactNode, props?: any }) {
    const [frameloop, setFrameloop] = useState<"never" | "always">("never");

    return (
        <Canvas
            shadows={{ type: THREE.PCFSoftShadowMap }}
            frameloop={frameloop}
            gl={async ({ canvas }) => {
                const renderer = new THREE.WebGPURenderer({
                    // ...props as any,
                    canvas: canvas as HTMLCanvasElement,
                    antialias: true,
                    stencil: false,
                    // powerPreference: "high-performance",
                    // alpha: false, // makes background opaque
                    // @ts-expect-error futuristic
                    shadowMap: true,
                });
                await renderer.init().then(() => {
                    setFrameloop("always");
                });
                return renderer
            }}
            camera={{
                position: [0, 2, 5],
                fov: 50, near: 0.25,
                far: 50
            }}
        >
            {children}
        </Canvas>
    );
}
