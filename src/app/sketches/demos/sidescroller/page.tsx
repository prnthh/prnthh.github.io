"use client";

import { Physics, RapierRigidBody } from "@react-three/rapier";
import { Environment } from "@react-three/drei";
import Controls from "@/shared/ControlsProvider";
import { ShadowLight } from "@/app/sketches/lighting/shadowmap/ShadowLight";
import { Suspense, useEffect, useRef } from "react";
import { GameCanvas } from "@/shared/GameCanvas";
import { EditorModes, SceneNode, Viewer } from "../../editor/scene/viewer/SceneViewer";
import drive from "./map";
import { GameEngine } from "../../editor/scene/editor/EditorContext";
import { CharacterController } from "../../controllers/shouldercam/CharacterController";
import dynamic from 'next/dynamic'
import Ped from "../../controllers/click/ped/ped";
import { Group, Mesh } from "three";
import { useContext } from 'react'
import { MPContext } from './MP'
import tunnel from "tunnel-rat";
const MPProvider = dynamic(() => import('./MP'), { ssr: false })

const ui = tunnel()

export default function Home() {
    return (
        <div className="items-center justify-items-center min-h-screen">
            <div className="w-full" style={{ height: "100vh" }}>
                <Controls>
                    <GameEngine mode={EditorModes.Play} sceneGraph={drive as unknown as SceneNode[]}>
                        <GameCanvas>
                            <Physics paused={false}>
                                <Game />
                            </Physics>
                        </GameCanvas>
                    </GameEngine>
                </Controls>
            </div>
            <ui.Out />
        </div>
    );
}




const Game = () => {
    const rbref = useRef<RapierRigidBody | null>(null);
    const meshref = useRef<Group | null>(null);

    // Broadcast character position every second
    useEffect(() => {
        const interval = setInterval(() => {
            if (rbref.current) {
                const pos = rbref.current.translation();
                window.dispatchEvent(new CustomEvent('mp-pos', { detail: [pos.x, pos.y, pos.z] }))
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return <>
        <CharacterController
            mode="side-scroll"
            forwardRef={({ rbref: rb, meshref: mesh }) => {
                rbref.current = rb.current;
                meshref.current = mesh.current;
            }}
        />
        <MPProvider roomId="my-room-id" ui={ui}>

            <MPStuff />
        </MPProvider>

        <ambientLight intensity={0.5} />
        <ShadowLight />
        <Viewer />

        <ambientLight intensity={0.5} />
        <Environment files="/textures/skybox3.jpg" background={true} />
    </>
}

const MPStuff = () => {
    const { peerPositions } = useContext(MPContext)

    return <>
        {/* Peer peds */}
        {
            Object.entries(peerPositions).map(([peerId, position]) => (
                <Ped key={peerId} modelUrl={'rigga.glb'} position={position} height={1.5} />
            ))
        }
    </>
}