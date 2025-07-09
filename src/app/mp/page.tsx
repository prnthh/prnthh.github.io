"use client";

import ChatBox from "./ChatBox";
import ColyseusProvider from "./ColyseusProvider";
import { CanvasGame } from "./Game";

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <ColyseusProvider>
                <CanvasGame />
                <ChatBox />
            </ColyseusProvider>
        </div>
    );
}


