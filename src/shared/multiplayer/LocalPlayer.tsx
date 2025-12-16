
import { RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import { getMyState } from "@/shared/providers/MultiplayerStore";
import { useMultiplayerProvider } from "./TrysteroMultiplayerProvider";
import FirstPersonController from "@/app/sketches/controllers/firstperson/FirstPersonController";
import { ThirdPersonController } from "@/app/sketches/controllers/thirdperson/ThirdPersonController";
import { useFrame } from "@react-three/fiber";

// Thresholds for detecting significant changes
const POSITION_THRESHOLD = 0.05; // 5cm
const ROTATION_THRESHOLD = 0.05; // ~3 degrees
const UPDATE_RATE = 0.1; // Send updates at most every 100ms

const LocalPlayer = () => {
    const rigidBodyRef = useRef<RapierRigidBody | null>(null);
    const bodyMeshRef = useRef<THREE.Group | null>(null);
    const cameraRigRef = useRef<THREE.Group | null>(null);
    const setMyState = useMultiplayerProvider();

    const timeSinceLastUpdate = useRef(0);
    const tempQuat = useRef(new THREE.Quaternion());
    const tempEuler = useRef(new THREE.Euler());

    useFrame((_, delta) => {
        if (typeof setMyState !== 'function') return;

        timeSinceLastUpdate.current += delta;

        // Only check for updates at UPDATE_RATE intervals
        if (timeSinceLastUpdate.current < UPDATE_RATE) return;

        if (bodyMeshRef.current && rigidBodyRef.current && cameraRigRef.current) {
            const pos = rigidBodyRef.current.translation();
            const rot = rigidBodyRef.current.rotation();
            const rotX = cameraRigRef.current.rotation.x;

            // Convert quaternion to euler with YXZ order (same as controller)
            tempQuat.current.set(rot.x, rot.y, rot.z, rot.w);
            tempEuler.current.setFromQuaternion(tempQuat.current, 'YXZ');

            const newState = {
                position: [pos.x, pos.y, pos.z] as [number, number, number],
                rotation: [rotX, tempEuler.current.y] as [number, number],
            };

            // Get last sent state from Zustand
            const lastSentState = getMyState();

            // Check if there's a significant change
            let shouldSend = false;

            if (!lastSentState) {
                shouldSend = true;
            } else {
                // Check position difference
                const posDiff = Math.sqrt(
                    Math.pow(newState.position[0] - lastSentState.position[0], 2) +
                    Math.pow(newState.position[1] - lastSentState.position[1], 2) +
                    Math.pow(newState.position[2] - lastSentState.position[2], 2)
                );

                // Check rotation difference
                const rotDiff = Math.max(
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
                timeSinceLastUpdate.current = 0;
            }
        }
    });

    return <FirstPersonController
        forwardRef={(refs) => {
            rigidBodyRef.current = refs.rbref.current;
            bodyMeshRef.current = refs.meshref.current;
            cameraRigRef.current = refs.cameraRigRef.current;
        }}
    />;

    return <ThirdPersonController
        forwardRef={(refs) => {
            rigidBodyRef.current = refs.rbref.current;
            bodyMeshRef.current = refs.meshref.current;
            cameraRigRef.current = refs.cameraRigRef.current;
        }}
    />
}

export default LocalPlayer;