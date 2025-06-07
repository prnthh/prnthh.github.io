"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Perf } from "r3f-perf";
import InstanceMeshTest from "./InstancedMesh2";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
                    <Perf matrixUpdate />

                    <ambientLight />
                    <InstanceMeshTest />
                    <OrbitControls enableDamping={false} />
                </Canvas>
            </div>
        </div>
    );
}
