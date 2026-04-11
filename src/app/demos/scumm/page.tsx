"use client";

import { Physics } from "@react-three/rapier";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box, OrbitControls } from "@react-three/drei";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GameCanvas } from "react-three-game";
import { PrefabRoot } from "react-three-game";
import type { Prefab } from "react-three-game";
import { useGameEvent } from "react-three-game";
import CutsceneCamera from "@/shared/cameras/CutsceneCamera";
import DebugGround from "@/shared/ground/DebugGround";

import CombinedController from "@/app/react-three-controller/combined/CombinedController";
import Ped from "@/app/react-three-controller/ped/ped";

const DEFAULT_PREFAB_PATH = "/samples/room.json";
const ROOM2_PREFAB_PATH = "/samples/room2.json";

const SCUMM_CAMERA_POSITION: [number, number, number] = [0, 0.6, 6];
const SCUMM_CAMERA_TARGET: [number, number, number] = [0, 0, 0];


export default function Home() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const prefabUrl = searchParams.get("prefab");
    const [target, setTarget] = useState<[number, number, number]>([0, 0, 2]);
    const characterRef = useRef<any>(null);
    const [activeEntity, setActiveEntity] = useState<string | null>(null);
    const [scenePrefab, setScenePrefab] = useState<Prefab | null>(null);
    const [prefabError, setPrefabError] = useState<string | null>(null);

    const loadScene = (nextPrefab: Prefab) => {
        setScenePrefab(nextPrefab);
        setPrefabError(null);
        setTarget([0, 0, 2]);
        setActiveEntity(null);
    };

    useGameEvent("portal:to-room2", () => {
        router.push(`${pathname}?prefab=${encodeURIComponent(ROOM2_PREFAB_PATH)}`);
    }, [pathname, router]);

    useGameEvent("portal:to-room1", () => {
        router.push(pathname);
    }, [pathname, router]);

    useEffect(() => {
        const resolvedPrefabUrl = prefabUrl ?? DEFAULT_PREFAB_PATH;

        let cancelled = false;

        const fetchPrefab = async (url: string) => {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load prefab: ${response.status} ${response.statusText}`);
            }

            return await response.json() as Prefab;
        };

        const loadPrefab = async () => {
            try {
                setPrefabError(null);
                const prefab = await fetchPrefab(resolvedPrefabUrl);

                if (!cancelled) {
                    loadScene(prefab);
                }
            } catch (error) {
                console.error("Failed to load prefab from URL", resolvedPrefabUrl, error);
                if (!cancelled) {
                    if (resolvedPrefabUrl !== DEFAULT_PREFAB_PATH) {
                        try {
                            const fallbackPrefab = await fetchPrefab(DEFAULT_PREFAB_PATH);
                            if (!cancelled) {
                                loadScene(fallbackPrefab);
                                setPrefabError(resolvedPrefabUrl);
                            }
                            return;
                        } catch (fallbackError) {
                            console.error("Failed to load default prefab fallback", fallbackError);
                        }
                    }

                    setScenePrefab(null);
                    setPrefabError(resolvedPrefabUrl);
                }
            }
        };

        void loadPrefab();

        return () => {
            cancelled = true;
        };
    }, [prefabUrl]);

    return (
        <div className="items-center justify-items-center min-h-screen">
            {prefabError && (
                <div className="absolute left-4 top-4 z-10 rounded bg-black/70 px-3 py-2 text-sm text-white">
                    Failed to load prefab from {prefabError}. Using default scene.
                </div>
            )}
            <div className="w-full" style={{ height: "100vh" }}>
                <GameCanvas>
                    <Physics>
                        <PrefabRoot
                            onSelect={(id) => {
                                console.log("selected prefab root", id);
                            }}
                            data={scenePrefab ?? undefined} />
                        <ambientLight intensity={1.5} />
                        <DebugGround position={[0, -0.99, 0]} onClick={(e) => {
                            setTarget([e.point.x, e.point.y, e.point.z])
                            setActiveEntity(null);
                        }} />

                        {target && (
                            <Box receiveShadow position={target} args={[0.1, 0.1, 0.1]} castShadow />
                        )}

                        <CombinedController model={'/models/human/onimilio/rigged.glb'} ref={characterRef} mode={"click"} target={target} />
                        {activeEntity === null && <SidewaysFollowCamera characterRef={characterRef} />}


                        <Ped
                            modelOffset={[0, -0.8, 0]} scale={2.4} height={1.5} position={[2, 0, 2]}
                            model="/models/human/rigga/rigga.glb"
                            onClick={(e) => {
                                setActiveEntity("ped");
                                e.stopPropagation();
                            }}
                        >
                            {activeEntity === "ped" && <CutsceneCamera position={[0, 1, 2]} />}
                        </Ped>
                    </Physics>
                </GameCanvas>
            </div>
        </div>
    );
}

const SidewaysFollowCamera = ({ characterRef }: { characterRef: React.RefObject<any> }) => {
    const orbitRef = useRef<any>(null);
    const targetCameraX = useRef(0);
    const tolerance = 1;
    const camera = useThree((state) => state.camera);

    useLayoutEffect(() => {
        targetCameraX.current = SCUMM_CAMERA_TARGET[0];
        camera.position.set(...SCUMM_CAMERA_POSITION);

        if (orbitRef.current) {
            orbitRef.current.target.set(...SCUMM_CAMERA_TARGET);
            orbitRef.current.update();
        }
    }, [camera]);

    useFrame(({ camera }) => {
        if (orbitRef.current && characterRef.current?.rigidBodyRef?.current) {
            const characterPos = characterRef.current.rigidBodyRef.current.translation();

            // Calculate the offset between character and camera target
            const offset = characterPos.x - targetCameraX.current;

            // Only move camera if character is outside the tolerance zone
            if (Math.abs(offset) > tolerance) {
                // Move camera to keep character at edge of tolerance zone
                if (offset > 0) {
                    targetCameraX.current = characterPos.x - tolerance;
                } else {
                    targetCameraX.current = characterPos.x + tolerance;
                }
            }

            // Smoothly update camera position to follow on x-axis
            camera.position.x += (targetCameraX.current - camera.position.x) * 0.1;

            // Update OrbitControls target to match camera x position
            orbitRef.current.target.x = camera.position.x;
            orbitRef.current.target.y = 0;
            orbitRef.current.target.z = 0;
            orbitRef.current.update();
        }
    });

    return (
        <OrbitControls
            ref={orbitRef}
            target={[0, 0, 0]}
            enableRotate={false}
            enablePan={false}
            minDistance={3}
            maxDistance={15}
        />
    );
}