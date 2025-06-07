"use client";

import React, { useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations, PerspectiveCamera } from "@react-three/drei";
import { Physics, RigidBody, BallCollider } from "@react-three/rapier";
import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";

const NUM_CUBES = 10;

const Scene = () => {
    const [modelReady, setModelReady] = useState(false);
    const [targetPosition, setTargetPosition] = useState<THREE.Vector3 | null>(null);
    const [targetQuaternion, setTargetQuaternion] = useState(new THREE.Quaternion());
    const [activeAction, setActiveAction] = useState<any>(null);
    const [targetCubeIndex, setTargetCubeIndex] = useState<number | null>(null); // Track which cube to kick
    const [kickImpulseApplied, setKickImpulseApplied] = useState(false);
    const [kickTargetPoint, setKickTargetPoint] = useState<THREE.Vector3 | null>(null);
    const modelRef = useRef<THREE.Group>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const leftFootRef = useRef<THREE.Object3D | null>(null);
    const leftFootPos = useRef([0, 0, 0]);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const controlsRef = useRef<any>(null);
    const raycaster = useRef(new THREE.Raycaster());
    const statsRef = useRef(new Stats());
    const leftFootBodyRef = useRef<any>(null);

    // Track cube mesh and rigidbody refs
    const cubeMeshRefs = useRef<THREE.Mesh[]>([]);
    const cubeBodyRefs = useRef<any[]>([]);

    useEffect(() => {
        document.body.appendChild(statsRef.current.dom);
        return () => {
            document.body.removeChild(statsRef.current.dom);
        };
    }, []);

    // Load models and animations
    const model = useGLTF("/models/human/kachujin/Kachujin.glb");
    const kick = useGLTF("/models/human/kachujin/Kachujin@kick.glb");
    const walk = useGLTF("/models/human/kachujin/Kachujin@walking.glb");

    const { animations } = model;
    const { actions, mixer } = useAnimations(animations, modelRef);
    mixerRef.current = mixer;

    useEffect(() => {
        if (model.scene && kick.animations && walk.animations && modelRef.current) {
            model.scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.frustumCulled = false;
                    child.geometry.computeVertexNormals();
                }
                if (child.name === "LeftFoot") {
                    leftFootRef.current = child;
                }
            });

            // Add kick and walk animations
            const kickAction = mixer.clipAction(kick.animations[0], modelRef.current);
            walk.animations[0].tracks.shift(); // Remove forward movement track
            const walkAction = mixer.clipAction(walk.animations[0], modelRef.current);
            actions["kick"] = kickAction;
            actions["walk"] = walkAction;
            setModelReady(true);
            setActiveAction(null); // Don't play walk on load
        }
    }, [model, kick, walk, actions, mixer]);

    // Remove handleDoubleClick and raycaster usage
    // Add a new handler for mesh click
    const handleCubeClick = (event: any, i: number) => {
        if (!modelRef.current || !cameraRef.current) return;

        // Use event.clientX/Y directly (react-three-fiber pointer event)
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Raycast from camera through mouse
        raycaster.current.setFromCamera({ x, y }, cameraRef.current);

        // Intersect with the clicked mesh only
        const mesh = cubeMeshRefs.current[i];
        if (!mesh) return;
        const intersects = raycaster.current.intersectObject(mesh, false);

        if (intersects.length === 0) return;

        const intersection = intersects[0];
        const p = intersection.point.clone();
        const n = intersection.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
        const rotationMatrixObject = new THREE.Matrix4().extractRotation(mesh.matrixWorld);
        const normalWorld = n.applyMatrix4(rotationMatrixObject);

        // Do NOT flatten p.y, keep the clicked height
        // p.y = 0;
        const walkToPoint = p.clone().addScaledVector(normalWorld, 1);
        walkToPoint.y = 0; // Only flatten the walk target, not the hit marker

        setTargetPosition(walkToPoint);
        const rotationMatrix = new THREE.Matrix4().lookAt(walkToPoint, modelRef.current.position, modelRef.current.up);
        setTargetQuaternion(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));

        setTargetCubeIndex(i);

        // Start walk animation
        if (actions["walk"]) {
            setActiveAction(actions["walk"]);
            actions["walk"].reset().fadeIn(0.2).play();
        }

        setKickTargetPoint(p.clone()); // Save intersection point for red box
    };

    // Animation and physics update
    useFrame((state, delta) => {
        if (delta > 0.1) delta = 0.1;
        statsRef.current.update();

        if (modelReady && modelRef.current && mixerRef.current) {
            mixerRef.current.update(delta);

            if (targetPosition) {
                const speed = 2; // 2 meters per second
                const direction = targetPosition.clone().sub(modelRef.current.position).normalize();
                const distance = modelRef.current.position.distanceTo(targetPosition);

                if (distance > 0.1) {
                    modelRef.current.position.addScaledVector(direction, speed * delta);
                    if (controlsRef.current) {
                        controlsRef.current.target.set(modelRef.current.position.x, modelRef.current.position.y + 1, modelRef.current.position.z);
                    }
                } else {
                    // Only trigger kick if facing target
                    const angle = modelRef.current.quaternion.angleTo(targetQuaternion);
                    if (angle < 0.05) { // ~3 degrees
                        setTargetPosition(null);
                        // Prepare to kick
                        if (actions["kick"]) {
                            setActiveAction(actions["kick"]);
                            actions["kick"].clampWhenFinished = true;
                            actions["kick"].loop = THREE.LoopOnce;
                            actions["kick"].reset().fadeIn(0.2).play();
                        }
                    }
                }
            }

            // Rotate towards target
            if (!modelRef.current.quaternion.equals(targetQuaternion)) {
                modelRef.current.quaternion.slerp(targetQuaternion, delta * 10);
            }

            // Sync left foot physics body to animated foot
            if (leftFootRef.current && leftFootBodyRef.current) {
                const worldPos = new THREE.Vector3();
                leftFootRef.current.getWorldPosition(worldPos);
                leftFootBodyRef.current.setTranslation(
                    { x: worldPos.x, y: worldPos.y, z: worldPos.z },
                    true
                );
                leftFootBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                leftFootBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
            }

            // When kick animation starts, apply impulse to the cube
            if (activeAction === actions["kick"] && actions["kick"]?.isRunning() && targetCubeIndex !== null) {
                // Only apply impulse once per kick
                if (!kickImpulseApplied) {
                    setKickImpulseApplied(true);
                    const cubeBody = cubeBodyRefs.current[targetCubeIndex];
                    if (cubeBody) {
                        // Apply impulse in the direction the character is facing
                        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(modelRef.current.quaternion);
                        cubeBody.applyImpulse({ x: forward.x * 10, y: 2, z: forward.z * 10 }, true);
                    }
                }
            }
            // Reset impulse flag when not kicking
            if (activeAction !== actions["kick"] && kickImpulseApplied) {
                setKickImpulseApplied(false);
            }
        }
    });

    // Texture for plane and cubes
    const texture = useLoader(THREE.TextureLoader, "/textures/floor/checker/FloorsCheckerboard_S_Diffuse.jpg");

    // Helper to register cube mesh/body refs
    const registerCube = (mesh: THREE.Mesh, body: any, idx: number) => {
        cubeMeshRefs.current[idx] = mesh;
        cubeBodyRefs.current[idx] = body;
    };

    {/*
        The issue is that the mesh refs are not guaranteed to be set before the RigidBody ref callback runs.
        To ensure both mesh and body refs are registered, use a React state to store cube positions,
        and render cubes with deterministic positions and refs.
    */}
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
            <OrbitControls ref={controlsRef} target={[0, 1, 0]} screenSpacePanning />
            <Physics gravity={[0, -9.82, 0]}>
                <RigidBody type="fixed" enabledRotations={[false, true, false]}>
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
                {/* Keep leftFoot RigidBody and BallCollider, sync its position in useFrame */}
                <RigidBody ref={leftFootBodyRef} type="dynamic" mass={1} enabledRotations={[false, false, false]}>
                    <mesh>
                        <sphereGeometry args={[0.2]} />
                        <meshBasicMaterial wireframe color="green" />
                    </mesh>
                    <BallCollider args={[0.2]} />
                </RigidBody>
                <primitive object={model.scene} ref={modelRef} />
                {/* Render a red box at the intersection point */}
                {kickTargetPoint && (
                    <mesh position={kickTargetPoint}>
                        <boxGeometry args={[0.3, 0.3, 0.3]} />
                        <meshStandardMaterial color="red" />
                    </mesh>
                )}
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
            <spotLight
                position={[-2.5, 5, 2.5]}
                angle={Math.PI / 4}
                penumbra={0.5}
                intensity={100}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-near={0.5}
                shadow-camera-far={20}
            />
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