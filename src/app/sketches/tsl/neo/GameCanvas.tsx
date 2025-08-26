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
                    // powerPreference: "high-performance",
                    antialias: true,
                    // alpha: false, // makes background opaque
                    stencil: false,
                    // @ts-expect-error futuristic
                    shadowMap: true,
                });
                await renderer.init().then(() => {
                    setFrameloop("always");
                });
                return renderer
            }}
            camera={{ position: [2, 2.5, 3], fov: 50, near: 0.25, far: 30 }}
        >
            {children}
        </Canvas>
    );
}
