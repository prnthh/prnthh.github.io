"use client";
import InteractiveSphere from "./InteractiveSphere";
import { WebGPUCanvas } from "./WebGPUCanvas";

export default function BasicInteractiveSpherePage() {
    return (
        <main>
            <div className="w-full" style={{ height: "100vh" }}>

                <WebGPUCanvas>
                    <ambientLight intensity={1} />
                    <pointLight intensity={3} position={[0, 2, 2]} />
                    <InteractiveSphere />
                    {/* <BloomPass /> */}
                </WebGPUCanvas>
            </div>
        </main>
    );
}