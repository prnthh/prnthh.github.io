"use client";
import GameCanvas from "@/shared/GameCanvas";
import InteractiveSphere from "../../../../shared/shaders/InteractiveSphere";

export default function BasicInteractiveSpherePage() {
    return (
        <main>
            <div className="w-full" style={{ height: "100vh" }}>

                <GameCanvas>
                    <ambientLight intensity={1} />
                    <pointLight intensity={3} position={[0, 2, 2]} />
                    <InteractiveSphere />
                    {/* <BloomPass /> */}
                </GameCanvas>
            </div>
        </main>
    );
}