"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import LoadingSpinner from "../../loading/loading";

const Game = dynamic(() => import("./Game"), {
    ssr: false,
});

export default function Home() {
    const [isCanvasReady, setIsCanvasReady] = useState(false);

    return (
        <>
            {!isCanvasReady && <LoadingSpinner />}
            <div className="items-center justify-items-center min-h-screen">
                <div className="w-full" style={{ height: "100vh" }}>
                    <Game onCanvasReady={() => setIsCanvasReady(true)} />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-1/2">
                    +
                </div>
            </div>
        </>
    );
}