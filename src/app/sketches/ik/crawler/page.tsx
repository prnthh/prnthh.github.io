"use client";

import Controls from "@/shared/ControlsProvider";
import { Sketch } from "./sketch";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <Sketch />
                </Controls>
            </div>
        </div>
    );
}
