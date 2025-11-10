"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import GameCanvas from "@/shared/GameCanvas";
import DemoWorld from "@/shared/DemoWorld";
import ControllerJoystick from "@/shared/controls/ControllerJoystick";
import MultiplayerProvider from "./MultiplayerProvider";
import OtherPlayers from "./OtherPlayers";
import LocalPlayer from "./LocalPlayer";


export default function Home() {
    const handleTap = () => {
        // Check if we're on mobile and not already in fullscreen
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                elem.requestFullscreen?.() ||
                    (elem as any).webkitRequestFullscreen?.() ||
                    (elem as any).mozRequestFullScreen?.() ||
                    (elem as any).msRequestFullscreen?.();
            }
        }
    };

    return (
        <div className="items-center justify-items-center min-h-screen select-none" onClick={handleTap}>
            <div className="w-full" style={{ height: "100vh" }}>
                <MultiplayerProvider roomId="lobby">
                    <GameCanvas>
                        <Physics debug>
                            <DemoWorld />
                            <Train />

                            <LocalPlayer />
                            <OtherPlayers />
                        </Physics>
                        <ambientLight intensity={1} />
                        <directionalLight castShadow position={[10, 10, 5]} intensity={1} />
                    </GameCanvas>
                </MultiplayerProvider>
            </div>
            <div className='absolute bottom-10 left-10 z-50 text-white select-none'>
                <ControllerJoystick horizontalAxis='horizontal' verticalAxis='vertical' />
            </div>
            <div className='absolute bottom-10 right-10 z-50 text-white select-none'>
                <ControllerJoystick horizontalAxis='lookHorizontal' verticalAxis='lookVertical' />
            </div>
        </div>
    );
}

const Train = ({ position = [10, 0, -10] }: { position?: [number, number, number] }) => {
    return <RigidBody type='kinematicVelocity' position={position} linearVelocity={[0, 0, 1]}>
        <mesh castShadow>
            <boxGeometry args={[4, 0.1, 8]} />
            <meshStandardMaterial color="red" />
        </mesh>
    </RigidBody>
}