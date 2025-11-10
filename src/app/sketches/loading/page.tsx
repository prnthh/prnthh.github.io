"use client";

import GameCanvas from "@/shared/GameCanvas";
import SimpleModel from "@/shared/SimpleModel";
import { Suspense } from "react";
import { Physics } from "@react-three/rapier";
import Balloon from "@/shared/physics/Balloon";

export default function LoadingTest() {
    return <div className="flex items-center justify-items-center w-screen h-screen dark:text-white">
        <GameCanvas>
            <Physics>
                <Balloon position={[0, 2, 0]} />
            </Physics>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <SimpleModel modelUrl="/models/cars/taxi/car.glb" position={[0, 0, 0]} />
            <color attach={"background"} args={['green']} />
        </GameCanvas>
    </div >

}
