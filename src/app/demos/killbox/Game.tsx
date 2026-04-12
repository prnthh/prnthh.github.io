"use client";

import Controls from "@/app/react-three-controller/controls/ControlsProvider";
import { GameCanvas, PrefabRoot, registerComponent } from "react-three-game";
import { useCanvasReady } from "@/app/sketches/loading/GameWithLoader";
import killbox from "@public/samples/killbox.json";
import { Physics } from "@react-three/rapier";
import FirstPersonPlayer from "./FirstPersonPlayer";

registerComponent(FirstPersonPlayer);

function ReadyNotifier() {
    useCanvasReady();
    return null;
}

export default function GameWrapper() {
    return (
        <Controls>
            <div className="min-h-screen select-none">
                <div className="w-full" style={{ height: "100vh" }}>
                    <GameCanvas>
                        <Physics>
                            <color attach="background" args={["#b5e9ff"]} />
                            <PrefabRoot data={killbox} />
                        </Physics>
                        <ReadyNotifier />
                    </GameCanvas>
                </div>
            </div>
        </Controls>
    );
}