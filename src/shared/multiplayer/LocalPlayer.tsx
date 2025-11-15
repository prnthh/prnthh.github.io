
import { RapierRigidBody } from "@react-three/rapier";
import FirstPersonController from "@/shared/firstperson/FirstPersonController";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getMyState } from "@/shared/providers/MultiplayerStore";
import { useMultiplayerProvider } from "./TrysteroMultiplayerProvider";
import { CharacterController } from "../shouldercam/CharacterController";

const LocalPlayer = () => {
    const rigidBodyRef = useRef<RapierRigidBody | null>(null);
    const bodyMeshRef = useRef<THREE.Group | null>(null);
    const cameraRigRef = useRef<THREE.Group | null>(null);
    const setMyState = useMultiplayerProvider();

    // Thresholds for detecting significant changes
    const POSITION_THRESHOLD = 0.05; // 5cm
    const ROTATION_THRESHOLD = 0.05; // ~3 degrees

    useEffect(() => {
        const updateInterval = setInterval(() => {
            if (typeof setMyState !== 'function') return;

            if (bodyMeshRef.current && rigidBodyRef.current && cameraRigRef.current) {
                const pos = rigidBodyRef.current.translation();
                const rot = rigidBodyRef.current.rotation();
                const rotX = cameraRigRef.current.rotation.x;

                // Convert quaternion to euler with YXZ order (same as controller)
                const tempQuat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
                const tempEuler = new THREE.Euler().setFromQuaternion(tempQuat, 'YXZ');

                const newState = {
                    position: [pos.x, pos.y, pos.z] as [number, number, number],
                    rotation: [rotX, tempEuler.y] as [number, number],
                };

                // Get last sent state from Zustand
                const lastSentState = getMyState();

                // Check if there's a significant change
                let shouldSend = false;
                let posDiff = 0;
                let rotDiff = 0;

                if (!lastSentState) {
                    shouldSend = true;
                } else {
                    // Check position difference
                    posDiff = Math.sqrt(
                        Math.pow(newState.position[0] - lastSentState.position[0], 2) +
                        Math.pow(newState.position[1] - lastSentState.position[1], 2) +
                        Math.pow(newState.position[2] - lastSentState.position[2], 2)
                    );

                    // Check rotation difference
                    rotDiff = Math.max(
                        Math.abs(newState.rotation[0] - lastSentState.rotation[0]),
                        Math.abs(newState.rotation[1] - lastSentState.rotation[1])
                    );

                    shouldSend = posDiff > POSITION_THRESHOLD || rotDiff > ROTATION_THRESHOLD;
                }

                // Only send if there's a significant change
                if (shouldSend) {
                    setMyState({
                        position: newState.position,
                        rotation: newState.rotation,
                        appearance: { color: 'blue' }
                    });
                }
            }
        }, 100);

        return () => clearInterval(updateInterval);
    }, [setMyState]);

    // return <FirstPersonController
    //     forwardRef={(refs) => {
    //         rigidBodyRef.current = refs.rbref.current;
    //         bodyMeshRef.current = refs.meshref.current;
    //         cameraRigRef.current = refs.cameraRigRef.current;
    //     }}
    // />;

    return <CharacterController
        forwardRef={(refs) => {
            rigidBodyRef.current = refs.rbref.current;
            bodyMeshRef.current = refs.meshref.current;
            cameraRigRef.current = refs.cameraRigRef.current;
        }}
    />
}

export default LocalPlayer;