"use client";

import { GameCanvas } from "react-three-game";
import SimpleModel from "@/shared/SimpleModel";

export default function LoadingTest() {
    return <div className="flex items-center justify-items-center w-screen h-screen dark:text-white">
        <GameCanvas>
            <StaticBalloon position={[0, 2, 0]} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <SimpleModel modelUrl="/models/cars/taxi/car.glb" position={[0, 0, 0]} />
            <color attach={"background"} args={['green']} />
        </GameCanvas>
    </div >

}

function StaticBalloon({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            <mesh position={[0, 0.8, 0]} castShadow>
                <sphereGeometry args={[0.45, 24, 24]} />
                <meshStandardMaterial color="tomato" />
            </mesh>
            <mesh castShadow>
                <boxGeometry args={[0.1, 0.6, 0.1]} />
                <meshStandardMaterial color="orange" />
            </mesh>
        </group>
    );
}
