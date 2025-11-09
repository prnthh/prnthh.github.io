"use client";

import React, { useState, useRef, useMemo } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import Character from "./Character";
import DemoWorld from "@/shared/DemoWorld";

const NUM_CUBES = 10;
const KICK_DISTANCE = 1.2;

const Scene = () => {
    const [kickTargetPoint, setKickTargetPoint] = useState<THREE.Vector3 | null>(null);
    const [kickNormal, setKickNormal] = useState<THREE.Vector3 | null>(null);
    const [targetPosition, setTargetPosition] = useState<THREE.Vector3 | null>(null);
    const [targetCubeIndex, setTargetCubeIndex] = useState<number | null>(null);

    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const controlsRef = useRef<any>(null);
    const raycaster = useRef(new THREE.Raycaster());
    const cubeMeshRefs = useRef<THREE.Mesh[]>([]);
    const cubeBodyRefs = useRef<any[]>([]);
    const characterPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());

    const texture = useLoader(THREE.TextureLoader, "/textures/floor/checker/FloorsCheckerboard_S_Diffuse.jpg");
    const cubePositions = useMemo<[number, number, number][]>(
        () =>
            Array.from({ length: NUM_CUBES }, () => [
                Math.random() < 0.5 ? Math.random() * -8 - 2 : Math.random() * 8 + 2,
                5 + Math.random() * 2,
                Math.random() < 0.5 ? Math.random() * -8 - 2 : Math.random() * 8 + 2
            ] as [number, number, number]),
        []
    );

    const handleCubeClick = (event: any, i: number) => {
        if (!cameraRef.current) return;
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
        const mesh = cubeMeshRefs.current[i];
        if (!mesh) return;
        const intersects = raycaster.current.intersectObject(mesh, false);
        if (!intersects.length) return;
        const intersection = intersects[0];
        const p = intersection.point.clone();
        const n = intersection.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
        const normalWorld = n.applyMatrix4(new THREE.Matrix4().extractRotation(mesh.matrixWorld)).normalize();
        const kickPos = p.clone().addScaledVector(normalWorld, KICK_DISTANCE);
        kickPos.y = 0;
        setTargetPosition(kickPos);
        setTargetCubeIndex(i);
        setKickTargetPoint(p.clone());
        setKickNormal(normalWorld.clone());
        event.stopPropagation();
    };

    const handleKickReset = () => {
        setTargetCubeIndex(null);
        setKickTargetPoint(null);
        setKickNormal(null);
    };

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
                <DemoWorld />

                {cubePositions.map((pos, i) => (
                    <RigidBody
                        key={i}
                        colliders="cuboid"
                        mass={1}
                        position={pos}
                        ref={body => { cubeBodyRefs.current[i] = body; }}
                    >
                        <mesh
                            castShadow
                            ref={mesh => { cubeMeshRefs.current[i] = mesh as THREE.Mesh; }}
                            onClick={e => handleCubeClick(e, i)}
                        >
                            <boxGeometry args={[2, 2, 2]} />
                            <meshPhongMaterial map={texture} />
                        </mesh>
                    </RigidBody>
                ))}
                <Character
                    targetPosition={targetPosition}
                    setTargetPosition={setTargetPosition}
                    targetCubeIndex={targetCubeIndex}
                    kickTargetPoint={kickTargetPoint}
                    kickNormal={kickNormal}
                    setKickTargetPoint={setKickTargetPoint}
                    setKickNormal={setKickNormal}
                    cubeBodyRefs={cubeBodyRefs}
                    controlsRef={controlsRef}
                    onKickReset={handleKickReset}
                    characterPositionRef={characterPositionRef}
                />
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