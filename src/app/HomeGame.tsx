
import { Effects, Html, OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import { CuboidCollider, Physics, RapierRigidBody, RigidBody, useRevoluteJoint } from "@react-three/rapier";
import { Suspense, useRef } from "react";
import AnimatedModel from "@/shared/ped/HumanoidModel";
import GameCanvas from "@/shared/GameCanvas";

const Game = () => {
    return (
        <GameCanvas >
            <color attach="background" args={['darkred']} />
            <Physics>
                <SwingingModelOnBar />
            </Physics>

            <PerspectiveCamera makeDefault position={[0, 0.8, 2.7]} />
            <pointLight position={[0, -1, 2]} intensity={50} color={'orange'} />
            <ambientLight intensity={0.8} />

            <Html transform position={[0, 1.5, 0.28]} scale={0.1}>
                <div className="w-[260px] text-center text-black font-black">
                    hi im prnth, nothing to see here
                </div>
            </Html>
        </GameCanvas>
    );
}




function SwingingModelOnBar() {
    // Bar (fixed)
    const barRef = useRef<RapierRigidBody>(null as unknown as RapierRigidBody);
    // Model (dynamic)
    const modelRef = useRef<RapierRigidBody>(null as unknown as RapierRigidBody);

    // Revolute joint: anchor at[0, 1.5, 0.24](bar center), swing around Z axis
    useRevoluteJoint(barRef, modelRef, [
        [0, 0, 0], // bar local anchor
        [0, 1.97, 0.22], // model local anchor (model's hands at y=0.46 above its center)
        [1, 0, 0], // axis (Z axis)
    ]);

    return (
        <>
            <RigidBody ref={barRef} type="fixed" position={[0, 1.5, 0.24]}>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[0.7, 0.09, 0.05]} />
                    <meshStandardMaterial color="#888" />
                </mesh>
            </RigidBody>
            <RigidBody colliders={false} type="dynamic" ref={modelRef} position={[0, -0.47, 0]}>
                <CuboidCollider args={[0.2, 0.8, 0.2]} position={[0, 1, 0]} restitution={0.5} friction={1} />
                <AnimatedModel
                    basePath={"/models/human/onimilio/"}
                    model={"rigged.glb"}
                    rotation={[0, 0, 0]}
                    height={2}
                    scale={2}
                    position={[0, 0.15, 0]}
                    animationOverrides={{ idle: "anim/hang.fbx" }}
                    onClick={() => {
                        console.log("Model clicked, applying impulse");
                        if (modelRef.current) {
                            // Apply an impulse in the +X direction (perpendicular to the Z axis)
                            modelRef.current.applyImpulse({ x: 0, y: 0, z: -0.1 }, true);
                            console.log("Impulse applied to model");
                        }
                    }}
                />
            </RigidBody>
        </>
    );
}

export default Game;