"use client";

import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls, Sky } from "@react-three/drei";
import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RagdollR3F } from "./RagdollR3F";
import * as THREE from "three";
import GameCanvas from "@/shared/GameCanvas";
import DemoWorld from "@/shared/DemoWorld";

export default function Home() {

    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics debug>
                        <RagdollR3F />
                        <Sky sunPosition={new THREE.Vector3(100, 10, 100)} />
                        <DemoWorld />
                        <OrbitControls target={[0, 0, 0]} />
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}
