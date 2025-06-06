"use client";

import { Box } from "@react-three/drei";
import OcclusionDemo from "./OcclusionDemo";
export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <OcclusionDemo>
                    <Box position={[0, -2, 0]} />
                </OcclusionDemo>
            </div>
        </div>
    );
}
