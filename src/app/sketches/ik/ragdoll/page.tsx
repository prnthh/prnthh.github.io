"use client";

import { Physics } from "@react-three/rapier";
import { OrbitControls } from "@react-three/drei";
import { GameCanvas } from "react-three-game";
import DemoWorld from "@/shared/debug/DemoWorld";
import Ragdoll from "@/app/react-three-controller/ped/physics/Ragdoll";

export default function Home() {

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>
                        <Ragdoll />
                        <DemoWorld />
                        <OrbitControls target={[0, 0, 0]} />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}
