"use client";

import { Physics, RigidBody } from "@react-three/rapier";
import GameCanvas from "@/shared/GameCanvas";
import ControllerJoystick from "@/shared/controls/ControllerJoystick";
import MultiplayerProvider from "./MultiplayerProvider";
import OtherPlayers from "./OtherPlayers";
import LocalPlayer from "./LocalPlayer";
import DebugGround from "@/shared/debug/DebugGround";
import { ThreeElements } from "@react-three/fiber";


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
                        <Physics>
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

const DemoWorld = ({ ...props }: ThreeElements['group']) => {
    return <>
        <group {...props}>
            <DebugGround position={[0, 0, 0]} />
            <DebugGround position={[0, 100, 0]} rotation={[-Math.PI, 0, 0]} />

            <DebugGround position={[0, 50, -50]} rotation={[Math.PI / 2, 0, 0]} />
            <DebugGround position={[-50, 50, 0]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} />
            <DebugGround position={[0, 50, 50]} rotation={[-Math.PI / 2, 0, 0]} />
            <DebugGround position={[50, 50, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} />


            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} castShadow intensity={1000} />
        </group >
    </>

}

const Train = ({ position = [10, 0.2, -10] }: { position?: [number, number, number] }) => {
    return <RigidBody type='kinematicVelocity' position={position} linearVelocity={[0, 0, 1]}>
        <mesh castShadow>
            <boxGeometry args={[4, 0.1, 8]} />
            <meshStandardMaterial color="red" />
        </mesh>
    </RigidBody>
}