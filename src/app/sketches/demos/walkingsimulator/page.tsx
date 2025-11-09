"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import GameCanvas from "@/shared/GameCanvas";
import DemoWorld from "@/shared/DemoWorld";
import ControllerJoystick from "@/shared/controls/ControllerJoystick";
import Playground from "@/shared/ground/Playground";
import FirstPersonController from "@/shared/firstperson/FirstPersonController";


export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>
                        <DemoWorld />
                        <FirstPersonController />

                        <Train />
                    </Physics>
                    <ambientLight intensity={1} />
                    <directionalLight castShadow position={[10, 10, 5]} intensity={1} />
                </GameCanvas>
            </div>
            <div className='absolute bottom-10 left-10 z-50 text-white'>
                <ControllerJoystick horizontalAxis='horizontal' verticalAxis='vertical' />
            </div>
            <div className='absolute bottom-10 right-10 z-50 text-white'>
                <ControllerJoystick horizontalAxis='lookHorizontal' verticalAxis='lookVertical' />
            </div>
        </div>
    );
}

const Train = () => {
    return <RigidBody type='kinematicVelocity' position={[0, 0, -10]} linearVelocity={[0, 0, 1]}>
        <mesh castShadow>
            <boxGeometry args={[4, 0.1, 8]} />
            <meshStandardMaterial color="red" />
        </mesh>
    </RigidBody>
}