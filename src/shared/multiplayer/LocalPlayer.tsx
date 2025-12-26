
import { RapierRigidBody } from "@react-three/rapier";
import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { useMultiplayerStore, PeerState, getMyState } from "@/shared/providers/MultiplayerStore";
import { useMultiplayerProvider, useHitEvents, PlayerAction } from "./TrysteroMultiplayerProvider";
import FirstPersonController from "@/app/sketches/controllers/firstperson/FirstPersonController";
import { useFrame } from "@react-three/fiber";
import { selfId } from 'trystero';

// Game-specific constants
const MAX_HEALTH = 100;
const HIT_DAMAGE = 40;
const PLAYER_COLOR = 'blue';

// Network constants
const POSITION_THRESHOLD = 0.05;
const ROTATION_THRESHOLD = 0.05;
const UPDATE_RATE = 0.1;

const SPAWN_BOUNDS = { minX: -20, maxX: 20, minZ: -20, maxZ: 20, y: 2 };

const getRandomSpawnPosition = (): [number, number, number] => [
    SPAWN_BOUNDS.minX + Math.random() * (SPAWN_BOUNDS.maxX - SPAWN_BOUNDS.minX),
    SPAWN_BOUNDS.y,
    SPAWN_BOUNDS.minZ + Math.random() * (SPAWN_BOUNDS.maxZ - SPAWN_BOUNDS.minZ)
];

// Compare two PeerState objects for significant changes
const hasChanged = (prev: PeerState, next: PeerState): boolean => {
    if (JSON.stringify(prev.data) !== JSON.stringify(next.data)) return true;
    if (Math.hypot(
        next.position[0] - prev.position[0],
        next.position[1] - prev.position[1],
        next.position[2] - prev.position[2]
    ) > POSITION_THRESHOLD) return true;
    if (Math.abs(next.rotation[0] - prev.rotation[0]) > ROTATION_THRESHOLD ||
        Math.abs(next.rotation[1] - prev.rotation[1]) > ROTATION_THRESHOLD) return true;
    return false;
};

const LocalPlayer = ({ playerRef }: { playerRef?: React.RefObject<THREE.Object3D | null> }) => {
    const rigidBodyRef = useRef<RapierRigidBody | null>(null);
    const bodyMeshRef = useRef<THREE.Group | null>(null);
    const cameraRigRef = useRef<THREE.Group | null>(null);
    const setMyState = useMultiplayerProvider();
    const { onAction, sendAction } = useHitEvents();
    const { setData, updateData } = useMultiplayerStore.getState();

    const timeSinceLastUpdate = useRef(0);
    const lastSentState = useRef<PeerState | null>(null);
    const tempQuat = useRef(new THREE.Quaternion());
    const tempEuler = useRef(new THREE.Euler());

    // Initialize player data on mount
    useEffect(() => {
        setData('health', MAX_HEALTH);
        setData('color', PLAYER_COLOR);
    }, [setData]);

    // Handle incoming hit events
    useEffect(() => {
        if (!onAction) return;
        return onAction((action: PlayerAction) => {
            if (action.type === 'hit' && action.targetPeerId === selfId && rigidBodyRef.current) {
                const newHealth = updateData('health', (h = MAX_HEALTH) => Math.max(0, h - HIT_DAMAGE));
                timeSinceLastUpdate.current = UPDATE_RATE; // Force immediate broadcast

                if (newHealth <= 0) {
                    const newPos = getRandomSpawnPosition();
                    rigidBodyRef.current.setTranslation({ x: newPos[0], y: newPos[1], z: newPos[2] }, true);
                    rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    setData('health', MAX_HEALTH);
                }
            }
        });
    }, [onAction, setData, updateData]);

    useFrame((_, delta) => {
        if (typeof setMyState !== 'function') return;
        if (!rigidBodyRef.current || !cameraRigRef.current) return;

        timeSinceLastUpdate.current += delta;
        if (timeSinceLastUpdate.current < UPDATE_RATE) return;

        const pos = rigidBodyRef.current.translation();
        const rot = rigidBodyRef.current.rotation();
        tempQuat.current.set(rot.x, rot.y, rot.z, rot.w);
        tempEuler.current.setFromQuaternion(tempQuat.current, 'YXZ');

        const currentState = getMyState();
        const newState: PeerState = {
            ...currentState,
            position: [pos.x, pos.y, pos.z],
            rotation: [cameraRigRef.current.rotation.x, tempEuler.current.y],
        };

        if (!lastSentState.current || hasChanged(lastSentState.current, newState)) {
            lastSentState.current = newState;
            setMyState(newState);
            timeSinceLastUpdate.current = 0;
        }
    });

    const handleFire = useCallback(() => {
        sendAction?.({ type: 'shoot' });
    }, [sendAction]);

    return (
        <FirstPersonController
            forwardRef={(refs) => {
                rigidBodyRef.current = refs.rbref.current;
                bodyMeshRef.current = refs.meshref.current;
                cameraRigRef.current = refs.cameraRigRef.current;
                if (playerRef) playerRef.current = refs.meshref.current;
            }}
            onFire={handleFire}
        />
    );
};

export default LocalPlayer;