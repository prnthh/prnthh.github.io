"use client";

import { Physics } from "@react-three/rapier";
import GameCanvas from "@/shared/GameCanvas";

import DebugGround from "@/shared/debug/DebugGround";
import DebugCamera from "@/shared/cameras/DebugCamera";
import DraggableDiv from "@/shared/ui/DraggableDiv";
import NavigableWorld from "@/shared/navmesh/NavigableWorld";

export default function NavmeshExample() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
                        <GameEntityWorld />

                        <DebugCamera />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}

const GameEntityWorld = () => {

    return <>
        <NavigableWorld debug>
            <DebugGround size={200} />
        </NavigableWorld>
    </>;
}

