"use client";

import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations, PerspectiveCamera } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import * as THREE from "three";

const NUM_CUBES = 10;
const KICK_DISTANCE = 1.2;
const KICK_IMPULSE_FRAME = 0.25; // normalized time in kick animation to apply impulse

const Scene = () => {
    const [modelReady, setModelReady] = useState(false);
    const [targetPosition, setTargetPosition] = useState<THREE.Vector3 | null>(null);
    const [targetCubeIndex, setTargetCubeIndex] = useState<number | null>(null);
    const [kickTargetPoint, setKickTargetPoint] = useState<THREE.Vector3 | null>(null);
    const [kickNormal, setKickNormal] = useState<THREE.Vector3 | null>(null);
    const [kickImpulseApplied, setKickImpulseApplied] = useState(false);
    const [desiredRotationY, setDesiredRotationY] = useState<number | null>(null);
    const [readyToKick, setReadyToKick] = useState(false);

    const modelRef = useRef<THREE.Group>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const controlsRef = useRef<any>(null);
    const raycaster = useRef(new THREE.Raycaster());
    const cubeMeshRefs = useRef<THREE.Mesh[]>([]);
    const cubeBodyRefs = useRef<any[]>([]);

    // Load models and animations
    const model = useGLTF("/models/human/kachujin/Kachujin.glb");
    const kick = useGLTF("/models/human/kachujin/Kachujin@kick.glb");
    const walk = useGLTF("/models/human/kachujin/Kachujin@walking.glb");

    const { animations } = model;
    const { actions, mixer } = useAnimations(animations, modelRef);

    useEffect(() => {
        if (model.scene && kick.animations && walk.animations && modelRef.current) {
            model.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.frustumCulled = false;
                    child.geometry.computeVertexNormals();
                }
            });
            // Add kick and walk animations
            actions["kick"] = mixer.clipAction(kick.animations[0], modelRef.current);
            walk.animations[0].tracks.shift(); // Remove forward movement track
            actions["walk"] = mixer.clipAction(walk.animations[0], modelRef.current);
            setModelReady(true);
        }
    }, [model, kick, walk, actions, mixer]);

    // Handle cube click: set walk target and kick info
    const handleCubeClick = (event: any, i: number) => {
        if (!modelRef.current || !cameraRef.current) return;
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.current.setFromCamera({ x, y }, cameraRef.current);
        const mesh = cubeMeshRefs.current[i];
        if (!mesh) return;
        const intersects = raycaster.current.intersectObject(mesh, false);
        if (intersects.length === 0) return;
        const intersection = intersects[0];
        const p = intersection.point.clone();
        const n = intersection.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
        const rotationMatrixObject = new THREE.Matrix4().extractRotation(mesh.matrixWorld);
        const normalWorld = n.applyMatrix4(rotationMatrixObject).normalize();
        // Walk to a point in front of the cube (along the normal)
        const kickPos = p.clone().addScaledVector(normalWorld, KICK_DISTANCE);
        kickPos.y = 0;
        setTargetPosition(kickPos);
        setTargetCubeIndex(i);
        setKickTargetPoint(p.clone());
        setKickNormal(normalWorld.clone());
        // Set desired rotation to face the walk direction
        if (modelRef.current) {
            const pos = modelRef.current.position;
            const walkDir = kickPos.clone().sub(pos);
            walkDir.y = 0;
            if (walkDir.lengthSq() > 0.0001) {
                const walkAngle = Math.atan2(walkDir.x, walkDir.z);
                setDesiredRotationY(walkAngle);
            }
        }
    };

    // Animation and physics update
    useFrame((state, delta) => {
        if (!modelReady || !modelRef.current) return;
        mixer.update(delta);

        // Smoothly rotate model to desiredRotationY if set
        if (desiredRotationY !== null) {
            const currentY = modelRef.current.rotation.y;
            let deltaY = desiredRotationY - currentY;
            // Normalize angle to [-PI, PI]
            deltaY = ((deltaY + Math.PI) % (2 * Math.PI)) - Math.PI;
            const rotateStep = 4 * delta * Math.sign(deltaY); // rotation speed
            if (Math.abs(deltaY) > 0.02) {
                modelRef.current.rotation.y += Math.abs(rotateStep) > Math.abs(deltaY) ? deltaY : rotateStep;
                return; // Wait until facing direction before walking/kicking
            } else {
                modelRef.current.rotation.y = desiredRotationY;
                setDesiredRotationY(null);
            }
        }

        // Walk to target position
        if (targetPosition) {
            const pos = modelRef.current.position;
            const distance = pos.distanceTo(targetPosition);
            if (distance > 0.08) {
                // Before moving, ensure facing the direction
                const direction = targetPosition.clone().sub(pos);
                direction.y = 0;
                if (direction.lengthSq() > 0.0001) {
                    const walkAngle = Math.atan2(direction.x, direction.z);
                    if (Math.abs(modelRef.current.rotation.y - walkAngle) > 0.02) {
                        setDesiredRotationY(walkAngle);
                        return; // Wait until facing direction
                    }
                }
                modelRef.current.position.addScaledVector(direction.normalize(), 2 * delta);
                if (controlsRef.current) {
                    controlsRef.current.target.set(modelRef.current.position.x, modelRef.current.position.y + 1, modelRef.current.position.z);
                }
                if (actions["walk"] && !actions["walk"].isRunning()) {
                    actions["walk"].reset().fadeIn(0.2).play();
                }
            } else {
                setTargetPosition(null);
                if (actions["walk"] && actions["walk"].isRunning()) {
                    actions["walk"].fadeOut(0.2);
                }
                // Before kicking, face the kick target
                if (kickTargetPoint && modelRef.current) {
                    const pos = modelRef.current.position.clone();
                    pos.y = 0;
                    const kickDir = kickTargetPoint.clone().sub(pos);
                    kickDir.y = 0;
                    if (kickDir.lengthSq() > 0.0001) {
                        const kickAngle = Math.atan2(kickDir.x, kickDir.z);
                        if (Math.abs(modelRef.current.rotation.y - kickAngle) > 0.02) {
                            setDesiredRotationY(kickAngle);
                            setReadyToKick(true); // Set ready to kick after facing kick direction
                            return;
                        }
                    }
                }
                // If already facing, set ready to kick
                setReadyToKick(true);
            }
        }

        // Play kick animation if ready
        if (readyToKick && actions["kick"]) {
            actions["kick"].reset().fadeIn(0.1).setLoop(THREE.LoopOnce, 1).play();
            setKickImpulseApplied(false);
            setReadyToKick(false);
        }

        // Apply impulse at the correct moment in the kick animation
        if (
            actions["kick"]?.isRunning() &&
            targetCubeIndex !== null &&
            !kickImpulseApplied
        ) {
            // Only apply impulse when the kick animation is at the right frame
            const action = actions["kick"];
            const time = action.time / action.getClip().duration;
            if (time > KICK_IMPULSE_FRAME) {
                setKickImpulseApplied(true);
                const cubeBody = cubeBodyRefs.current[targetCubeIndex];
                if (cubeBody && kickNormal) {
                    cubeBody.applyImpulse(
                        { x: -kickNormal.x * 50, y: 10, z: -kickNormal.z * 50 },
                        true
                    );
                }
            }
        }

        // Reset state after kick
        if (!actions["kick"]?.isRunning() && kickImpulseApplied) {
            setKickImpulseApplied(false);
            setTargetCubeIndex(null);
            setKickTargetPoint(null);
            setKickNormal(null);
        }
    });

    const texture = useLoader(THREE.TextureLoader, "/textures/floor/checker/FloorsCheckerboard_S_Diffuse.jpg");
    const [cubePositions] = useState(() =>
        Array.from({ length: NUM_CUBES }, () => [
            Math.random() < 0.5 ? Math.random() * -8 - 2 : Math.random() * 8 + 2,
            5 + Math.random() * 2,
            Math.random() < 0.5 ? Math.random() * -8 - 2 : Math.random() * 8 + 2
        ])
    );

    return (
        <>
            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                fov={75}
                aspect={typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 1}
                near={0.01}
                far={1000}
                position={[0.8, 1.4, 1.0]}
            />
            <OrbitControls ref={controlsRef} />
            <Physics gravity={[0, -9.82, 0]}>
                <RigidBody type="fixed">
                    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[25, 25]} />
                        <meshPhongMaterial map={texture} />
                    </mesh>
                </RigidBody>
                {cubePositions.map((pos, i) => (
                    <RigidBody
                        key={i}
                        colliders="cuboid"
                        mass={1}
                        position={pos}
                        ref={body => {
                            cubeBodyRefs.current[i] = body;
                        }}
                    >
                        <mesh
                            castShadow
                            ref={mesh => {
                                cubeMeshRefs.current[i] = mesh as THREE.Mesh;
                            }}
                            onClick={e => handleCubeClick(e, i)}
                        >
                            <boxGeometry args={[2, 2, 2]} />
                            <meshPhongMaterial map={texture} />
                        </mesh>
                    </RigidBody>
                ))}
                <primitive object={model.scene} ref={modelRef} />
                {/* Show a cone at the intersection point */}
                {kickTargetPoint && kickNormal && (() => {
                    const quat = new THREE.Quaternion().setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        kickNormal
                    );
                    const euler = new THREE.Euler().setFromQuaternion(quat);
                    return (
                        <mesh position={kickTargetPoint} rotation={euler}>
                            <coneGeometry args={[0.2, 0.6, 16]} />
                            <meshStandardMaterial color="red" />
                        </mesh>
                    );
                })()}
            </Physics>
            <spotLight
                position={[2.5, 5, 2.5]}
                angle={Math.PI / 4}
                penumbra={0.5}
                intensity={100}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-near={0.5}
                shadow-camera-far={20}
            />
            <ambientLight intensity={0.5} />
            <axesHelper args={[5]} />
        </>
    );
};

export default function KickboxingPage() {
    return (
        <div className="w-full h-screen relative">
            <Canvas shadows>
                <Scene />
            </Canvas>
        </div>
    );
}