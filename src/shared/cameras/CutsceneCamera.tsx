import { forwardRef, useRef, useImperativeHandle, useLayoutEffect, useState, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { SceneCamera } from "./SceneCamera";
import * as THREE from "three";
import { Tween, Group as TweenGroup, Easing } from "@tweenjs/tween.js";

interface CutsceneCameraProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    duration?: number;
    fov?: number;
}

const CutsceneCamera = forwardRef<any, CutsceneCameraProps>(({
    position = [0, 0, 10],
    rotation,
    duration = 1500,
    fov = 75
}, ref) => {
    const sceneCameraRef = useRef<any>(null);
    const currentCamera = useThree((three) => three.camera);
    const tweenRef = useRef<Tween<any> | null>(null);
    const tweenGroupRef = useRef(new TweenGroup());
    const startPositionRef = useRef(new THREE.Vector3());
    const startQuaternionRef = useRef(new THREE.Quaternion());

    const [startWorldPosition] = useState(() => currentCamera.getWorldPosition(new THREE.Vector3()));
    const [startWorldQuaternion] = useState(() => currentCamera.getWorldQuaternion(new THREE.Quaternion()));

    const initializeCamera = useCallback((camera: THREE.PerspectiveCamera) => {
        const localStartPosition = startWorldPosition.clone();
        const localStartQuaternion = startWorldQuaternion.clone();
        const parent = camera.parent;

        if (parent) {
            parent.worldToLocal(localStartPosition);
            const parentWorldQuaternion = new THREE.Quaternion();
            parent.getWorldQuaternion(parentWorldQuaternion);
            localStartQuaternion.premultiply(parentWorldQuaternion.invert());
        }

        startPositionRef.current.copy(localStartPosition);
        startQuaternionRef.current.copy(localStartQuaternion);
        camera.position.copy(localStartPosition);
        camera.quaternion.copy(localStartQuaternion);
    }, [startWorldPosition, startWorldQuaternion]);

    // Forward the ref to expose the camera
    useImperativeHandle(ref, () => sceneCameraRef.current);

    useLayoutEffect(() => {
        if (!sceneCameraRef.current?.cameraRef?.current) return;

        const camera = sceneCameraRef.current.cameraRef.current;
        initializeCamera(camera);

        const startPosition = startPositionRef.current.clone();
        const startQuaternion = startQuaternionRef.current.clone();

        // Calculate target quaternion from rotation prop or use start quaternion
        const targetQuaternion = rotation
            ? new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]))
            : startQuaternion.clone();

        // Setup tween
        const startState = {
            px: startPosition.x,
            py: startPosition.y,
            pz: startPosition.z,
            t: 0, // interpolation factor for quaternion
        };

        const endState = {
            px: position[0],
            py: position[1],
            pz: position[2],
            t: 1,
        };

        // Create and start the tween
        const tween = new Tween(startState, tweenGroupRef.current)
            .to(endState, duration)
            .easing(Easing.Quadratic.InOut)
            .onUpdate((state) => {
                camera.position.set(state.px, state.py, state.pz);
                // Use quaternion slerp for smooth rotation
                camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, state.t);
            });

        tweenRef.current = tween;
        tween.start();

        return () => {
            tween.stop();
        };
    }, [initializeCamera, position, rotation, duration]);

    useFrame((state, delta) => {
        tweenGroupRef.current.update(performance.now());
    });

    return <SceneCamera ref={sceneCameraRef} fov={fov} initializeCamera={initializeCamera} />;
});

export default CutsceneCamera;