"use client";

import { Physics, RapierRigidBody } from "@react-three/rapier";
import { Environment, Html } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { EditorModes, SceneNode, Viewer } from "../../editor/scene/viewer/SceneViewer";
import drive from "./map";
import { GameEngine } from "../../editor/scene/editor/EditorContext";
import dynamic from 'next/dynamic'
import { Group, Mesh } from "three";
import { useContext } from 'react'
import { MPContext } from './MP'
import tunnel from "tunnel-rat";
import * as THREE from "three";
import NetworkThing from "./NetworkThing";
import type { PeerState } from "./MP";
import Controls from "@/shared/controls/ControlsProvider";
import GameCanvas from "@/shared/GameCanvas";
import ModelAttachment from "@/shared/ped/ModelAttachment";
import Ped from "@/shared/ped/ped";
import { CharacterController } from "@/shared/shouldercam/CharacterController";
import { ShadowLight } from "@/shared/lighting/ShadowLight";
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
        >
            {<ModelAttachment
                model="/models/environment/Katana.glb"
                attachpoint="mixamorigRightHand"
                offset={new THREE.Vector3(0, 0, 0)}
                scale={new THREE.Vector3(100, 100, 100)}
                rotation={new THREE.Vector3(0, 0, 0)}
            />}
        </CharacterController>

        <NetworkThing
            scale={new THREE.Vector3(0.03, 0.03, 0.03)}
            position={new THREE.Vector3(1.2, 0.64, -0.2)}
            modelUrl="/models/environment/Bell.glb"
            id="bell"
            soundUrl="/sound/click.mp3" // New: Pass the sound URL here
            onActivate={() => {
                console.log('Bell activated');
                // playSound("/sound/click.mp3"); // Play remotely if soundUrl provided

            }}
        />

        <MPProvider roomId="my-room-id" ui={ui}>

            <MPStuff />
        </MPProvider>

        <ambientLight intensity={0.5} />
        <ShadowLight />
        <Viewer />

        <ambientLight intensity={0.5} />
    </>
}

// Separate component for each peer ped
// ...existing code...

function PeerPed({ peerId, state }: { peerId: string, state: PeerState }) {
    // Show latest chat message if less than 5 seconds old
    const now = Date.now();
    const showMsg = state.latestMessage && (now - state.latestMessage.timestamp < 5000);

    return (
        <Ped
            key={peerId}
            basePath={"/models/human/onimilio/"}
            modelUrl={"rigged.glb"}
            position={state.position} height={1.5}
        >
            {state?.appearance?.hand && <ModelAttachment
                model="/models/environment/Katana.glb"
                attachpoint="mixamorigRightHand"
                offset={new THREE.Vector3(0, 0, 0)}
                scale={new THREE.Vector3(100, 100, 100)}
                rotation={new THREE.Vector3(0, 0, 0)}
            />}
            {/* <DialogCollider>
                Tralalero tralala
            </DialogCollider> */}
            {showMsg && (
                <Html position={[0, 1.4, 0]}>
                    <div className="-translate-x-[50%] min-w-[300px] text-3xl text-yellow-300 text-center p-2 rounded drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                        {state.latestMessage?.message}
                    </div>
                </Html>
            )}
        </Ped>
    );
}

const MPStuff = () => {
    const { peerStates } = useContext(MPContext)
    return <>
        {/* Peer peds */}
        {Object.entries(peerStates).map(([peerId, state]) => (
            <PeerPed key={peerId} peerId={peerId} state={state} />
        ))}
    </>
}